import type { SearchOptions } from "ldapts";
import { Client } from "ldapts";
import { prisma } from "@/lib/prisma";

export interface LegacyLdapConfig {
  serverUrl: string;
  baseDN: string;
  bindDN?: string;
  bindPassword?: string;
  searchFilter: string;
  timeout: number;
}

export interface LegacyLdapAuthResult {
  success: boolean;
  username?: string;
  userDN?: string;
  email?: string;
  displayName?: string;
  error?: string;
}

/**
 * データベースからレガシーLDAP設定を取得
 */
export async function loadLegacyLdapConfigFromDatabase(): Promise<LegacyLdapConfig | null> {
  try {
    const dbConfig = await prisma.legacyLdapConfig.findFirst();

    if (dbConfig?.isEnabled && dbConfig?.serverUrl) {
      return {
        serverUrl: dbConfig.serverUrl,
        baseDN: dbConfig.baseDN,
        bindDN: dbConfig.bindDN || undefined,
        bindPassword: dbConfig.bindPassword || undefined,
        searchFilter: dbConfig.searchFilter,
        timeout: dbConfig.timeout,
      };
    }

    return null;
  } catch (error) {
    console.warn(
      "[LegacyLdapService] Failed to load config from database:",
      error,
    );
    return null;
  }
}

/**
 * LDAP Migrationモジュールが有効かどうかを確認
 * モジュール管理画面の有効/無効トグルで制御
 */
export async function isLdapMigrationEnabled(): Promise<boolean> {
  try {
    // モジュールの有効状態をSystemSettingから確認
    // キー形式: module_enabled_{moduleId}
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "module_enabled_ldap-migration" },
    });

    return setting?.value === "true";
  } catch (error) {
    console.warn(
      "[LegacyLdapService] Failed to check migration enabled status:",
      error,
    );
    return false;
  }
}

/**
 * レガシーLDAPサービスクラス
 * レガシーLDAPサーバへの認証のみを担当（読み取り専用）
 */
export class LegacyLdapService {
  private config: LegacyLdapConfig;

  constructor(config: LegacyLdapConfig) {
    this.config = config;
  }

  /**
   * データベースから設定を読み込んでインスタンスを作成
   * @returns LegacyLdapService または null（設定がない場合）
   */
  static async createWithDatabaseConfig(): Promise<LegacyLdapService | null> {
    const config = await loadLegacyLdapConfigFromDatabase();
    if (!config) {
      return null;
    }
    return new LegacyLdapService(config);
  }

  /**
   * レガシーLDAPサーバが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    const client = this.createClient();
    try {
      // Anonymous Bindまたは管理者でバインドを試行
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(client, this.config.bindDN, this.config.bindPassword);
      } else if (this.config.bindDN) {
        // パスワードなしのバインド（Anonymous Bind）
        await this.anonymousBind(client);
      } else {
        await this.anonymousBind(client);
      }
      return true;
    } catch {
      return false;
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * レガシーLDAPでユーザ認証
   *
   * 認証フロー:
   * 1. 管理者/AnonymousでバインドしてユーザーDNを検索
   * 2. ユーザーDNとパスワードでバインドして認証
   */
  async authenticate(
    username: string,
    password: string,
  ): Promise<LegacyLdapAuthResult> {
    const searchClient = this.createClient();

    try {
      // 1. 管理者/Anonymousでバインドしてユーザーを検索
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(
          searchClient,
          this.config.bindDN,
          this.config.bindPassword,
        );
      } else {
        await this.anonymousBind(searchClient);
      }

      // 検索フィルタを構築（{username}をユーザー名で置換）
      const filter = this.config.searchFilter.replace(
        "{username}",
        this.escapeLdapFilter(username),
      );

      // ユーザーを検索
      const userEntry = await this.searchUser(searchClient, filter);

      if (!userEntry) {
        console.log(
          `[LegacyLdapService] User not found in legacy LDAP: ${username}`,
        );
        return {
          success: false,
          error: "User not found",
        };
      }

      const userDN = userEntry.dn as string;
      const email = this.getAttributeValue(userEntry, "mail");
      const displayName =
        this.getAttributeValue(userEntry, "displayName") ||
        this.getAttributeValue(userEntry, "cn");

      await this.closeClient(searchClient);

      // 2. ユーザーのDNとパスワードでバインドして認証
      const authClient = this.createClient();
      try {
        await this.bind(authClient, userDN, password);

        console.log(
          `[LegacyLdapService] Authentication successful: ${username}`,
        );

        return {
          success: true,
          username,
          userDN,
          email,
          displayName,
        };
      } catch (authError) {
        console.log(
          `[LegacyLdapService] Authentication failed (invalid password): ${username}`,
        );
        return {
          success: false,
          error: "Invalid credentials",
        };
      } finally {
        await this.closeClient(authClient);
      }
    } catch (error) {
      console.error(
        `[LegacyLdapService] Authentication error: ${username}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    } finally {
      await this.closeClient(searchClient);
    }
  }

  /**
   * 接続テスト（管理者/Anonymousバインドのみ）
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const client = this.createClient();
    try {
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(client, this.config.bindDN, this.config.bindPassword);
      } else {
        await this.anonymousBind(client);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザー検索（テスト用）
   */
  async testSearchUser(
    username: string,
  ): Promise<{
    success: boolean;
    userDN?: string;
    email?: string;
    displayName?: string;
    error?: string;
  }> {
    const client = this.createClient();
    try {
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(client, this.config.bindDN, this.config.bindPassword);
      } else {
        await this.anonymousBind(client);
      }

      const filter = this.config.searchFilter.replace(
        "{username}",
        this.escapeLdapFilter(username),
      );

      const userEntry = await this.searchUser(client, filter);

      if (!userEntry) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        userDN: userEntry.dn as string,
        email: this.getAttributeValue(userEntry, "mail"),
        displayName:
          this.getAttributeValue(userEntry, "displayName") ||
          this.getAttributeValue(userEntry, "cn"),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * 認証テスト（ユーザー名とパスワード）
   */
  async testAuthentication(
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    userDN?: string;
    email?: string;
    displayName?: string;
    error?: string;
  }> {
    const result = await this.authenticate(username, password);
    return {
      success: result.success,
      userDN: result.userDN,
      email: result.email,
      displayName: result.displayName,
      error: result.error,
    };
  }

  /**
   * ユーザーを検索
   */
  private async searchUser(
    client: Client,
    filter: string,
  ): Promise<Record<string, unknown> | null> {
    const opts: SearchOptions = {
      filter,
      scope: "sub",
      sizeLimit: 1,
      attributes: ["dn", "uid", "cn", "sn", "displayName", "mail"],
    };

    try {
      const { searchEntries } = await client.search(this.config.baseDN, opts);

      if (searchEntries.length === 0) {
        return null;
      }

      return searchEntries[0] as Record<string, unknown>;
    } catch (error) {
      console.error("[LegacyLdapService] Search error:", error);
      return null;
    }
  }

  /**
   * 属性値を取得
   */
  private getAttributeValue(
    entry: Record<string, unknown>,
    attr: string,
  ): string | undefined {
    const value = entry[attr];
    if (Array.isArray(value)) return value[0]?.toString();
    return value?.toString();
  }

  /**
   * LDAPフィルター用にエスケープ
   */
  private escapeLdapFilter(value: string): string {
    return value
      .replace(/\\/g, "\\5c")
      .replace(/\*/g, "\\2a")
      .replace(/\(/g, "\\28")
      .replace(/\)/g, "\\29")
      .replace(/\0/g, "\\00");
  }

  /**
   * LDAPクライアントを作成
   */
  private createClient(): Client {
    return new Client({
      url: this.config.serverUrl,
      timeout: this.config.timeout,
      connectTimeout: this.config.timeout,
    });
  }

  /**
   * LDAPバインド
   */
  private async bind(
    client: Client,
    dn: string,
    password: string,
  ): Promise<void> {
    await client.bind(dn, password);
  }

  /**
   * Anonymous バインド
   */
  private async anonymousBind(client: Client): Promise<void> {
    await client.bind("", "");
  }

  /**
   * クライアントを閉じる
   */
  private async closeClient(client: Client): Promise<void> {
    try {
      await client.unbind();
    } catch {
      // unbindエラーは無視
    }
  }
}
