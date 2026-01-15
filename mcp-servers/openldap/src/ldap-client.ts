import { Client, type SearchOptions } from "ldapts";

export interface LdapConfig {
  serverUrl: string;
  adminDN: string;
  adminPassword: string;
  baseDN: string;
  usersOU: string;
  timeout?: number;
}

export interface LdapUser {
  uid: string;
  dn: string;
  cn: string;
  sn: string;
  displayName?: string;
  mail?: string;
  employeeNumber?: string;
  boxEmployeeId?: string;
}

export interface ListUsersResult {
  success: boolean;
  users?: LdapUser[];
  total?: number;
  error?: string;
}

export interface GetUserResult {
  success: boolean;
  user?: LdapUser;
  error?: string;
}

export interface SearchUsersResult {
  success: boolean;
  users?: LdapUser[];
  error?: string;
}

/**
 * OpenLDAP クライアント（読み取り専用）
 * MCPサーバ用に既存のOpenLdapServiceを簡略化したもの
 */
export class LdapClient {
  private config: LdapConfig;
  private readonly timeout: number;

  constructor(config: LdapConfig) {
    this.config = config;
    this.timeout = config.timeout || 10000;
  }

  /**
   * 環境変数から設定を読み込んでインスタンスを作成
   */
  static createFromEnv(): LdapClient {
    const config: LdapConfig = {
      serverUrl: process.env.OPENLDAP_URL || "ldap://localhost:389",
      adminDN: process.env.OPENLDAP_ADMIN_DN || "cn=admin,dc=boxframe,dc=local",
      adminPassword: process.env.OPENLDAP_ADMIN_PASSWORD || "admin",
      baseDN: process.env.OPENLDAP_BASE_DN || "dc=boxframe,dc=local",
      usersOU: process.env.OPENLDAP_USERS_OU || "ou=users,dc=boxframe,dc=local",
      timeout: parseInt(process.env.OPENLDAP_TIMEOUT || "10000", 10),
    };
    return new LdapClient(config);
  }

  /**
   * OpenLDAPサーバが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    const client = this.createClient();
    try {
      await client.bind(this.config.adminDN, this.config.adminPassword);
      return true;
    } catch {
      return false;
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * サーバー情報を取得
   */
  getServerInfo(): {
    url: string;
    baseDN: string;
    usersOU: string;
  } {
    return {
      url: this.config.serverUrl,
      baseDN: this.config.baseDN,
      usersOU: this.config.usersOU,
    };
  }

  /**
   * ユーザ一覧を取得
   */
  async listUsers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ListUsersResult> {
    const client = this.createClient();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    try {
      await client.bind(this.config.adminDN, this.config.adminPassword);
      const users = await this.searchUsersInternal(
        client,
        "(objectClass=inetOrgPerson)",
      );

      // ページネーション適用
      const paginatedUsers = users.slice(offset, offset + limit);

      return {
        success: true,
        users: paginatedUsers,
        total: users.length,
      };
    } catch (error) {
      console.error("[LdapClient] Failed to list users:", error);
      const errorName = (error as { name?: string })?.name;
      if (errorName === "NoSuchObjectError") {
        return {
          success: true,
          users: [],
          total: 0,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list users",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザを検索
   */
  async searchUsers(query: string): Promise<SearchUsersResult> {
    const client = this.createClient();

    try {
      await client.bind(this.config.adminDN, this.config.adminPassword);

      const escapedQuery = this.escapeLdapFilter(query);
      const filter = `(&(objectClass=inetOrgPerson)(|(uid=*${escapedQuery}*)(cn=*${escapedQuery}*)(mail=*${escapedQuery}*)(displayName=*${escapedQuery}*)(employeeNumber=*${escapedQuery}*)))`;

      const users = await this.searchUsersInternal(client, filter);

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error("[LdapClient] Failed to search users:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search users",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザ詳細を取得
   */
  async getUser(uid: string): Promise<GetUserResult> {
    const client = this.createClient();

    try {
      await client.bind(this.config.adminDN, this.config.adminPassword);

      const escapedUid = this.escapeLdapFilter(uid);
      const filter = `(&(objectClass=inetOrgPerson)(uid=${escapedUid}))`;

      const users = await this.searchUsersInternal(client, filter);

      if (users.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        user: users[0],
      };
    } catch (error) {
      console.error("[LdapClient] Failed to get user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザが存在するか確認
   */
  async userExists(uid: string): Promise<boolean> {
    const result = await this.getUser(uid);
    return result.success && result.user !== undefined;
  }

  /**
   * 内部用: ユーザ検索
   */
  private async searchUsersInternal(
    client: Client,
    filter: string,
  ): Promise<LdapUser[]> {
    const opts: SearchOptions = {
      filter,
      scope: "sub",
      sizeLimit: 0,
      attributes: [
        "uid",
        "cn",
        "sn",
        "displayName",
        "mail",
        "employeeNumber",
        "boxEmployeeId",
      ],
    };

    const { searchEntries } = await client.search(this.config.usersOU, opts);

    const users: LdapUser[] = searchEntries.map((entry) => {
      const getAttr = (attr: string) => {
        const value = entry[attr];
        if (Array.isArray(value)) return value[0]?.toString();
        return value?.toString();
      };

      return {
        uid: getAttr("uid") || "",
        dn: entry.dn,
        cn: getAttr("cn") || "",
        sn: getAttr("sn") || "",
        displayName: getAttr("displayName"),
        mail: getAttr("mail"),
        employeeNumber: getAttr("employeeNumber"),
        boxEmployeeId: getAttr("boxEmployeeId"),
      };
    });

    return users;
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
      timeout: this.timeout,
      connectTimeout: this.timeout,
    });
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
