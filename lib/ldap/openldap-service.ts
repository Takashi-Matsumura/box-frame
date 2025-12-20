import type { Entry, SearchOptions } from "ldapts";
import { Attribute, Change, Client } from "ldapts";
import { prisma } from "@/lib/prisma";

export interface OpenLdapConfig {
  serverUrl: string;
  adminDN: string;
  adminPassword: string;
  baseDN: string;
  usersOU: string;
  timeout?: number;
}

/**
 * データベースからOpenLDAP設定を取得
 */
export async function loadOpenLdapConfigFromDatabase(): Promise<OpenLdapConfig> {
  try {
    const dbConfig = await prisma.openLdapConfig.findFirst();

    if (dbConfig?.serverUrl) {
      return {
        serverUrl: dbConfig.serverUrl,
        adminDN: dbConfig.adminDN,
        adminPassword: dbConfig.adminPassword,
        baseDN: dbConfig.baseDN,
        usersOU: dbConfig.usersOU,
        timeout: dbConfig.timeout,
      };
    }
  } catch (error) {
    console.warn(
      "[OpenLdapService] Failed to load config from database, using environment variables:",
      error,
    );
  }

  // データベースに設定がない場合は環境変数を使用
  return {
    serverUrl: process.env.OPENLDAP_URL || "ldap://localhost:389",
    adminDN: process.env.OPENLDAP_ADMIN_DN || "cn=admin,dc=occ,dc=co,dc=jp",
    adminPassword: process.env.OPENLDAP_ADMIN_PASSWORD || "admin",
    baseDN: process.env.OPENLDAP_BASE_DN || "dc=occ,dc=co,dc=jp",
    usersOU: process.env.OPENLDAP_USERS_OU || "ou=Users,dc=occ,dc=co,dc=jp",
    timeout: 10000,
  };
}

export interface OpenLdapAuthResult {
  success: boolean;
  username?: string;
  userDN?: string;
  email?: string;
  displayName?: string;
  employeeNumber?: string;
  boxEmployeeId?: string;
  error?: string;
}

export interface OpenLdapUserCreateResult {
  success: boolean;
  userDN?: string;
  error?: string;
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

export interface DeleteUserResult {
  success: boolean;
  error?: string;
}

export interface UpdateUserResult {
  success: boolean;
  error?: string;
}

/**
 * OpenLDAPサービスクラス
 * 新LDAPサーバ（OpenLDAP）への接続、認証、ユーザ作成を担当
 */
export class OpenLdapService {
  private config: OpenLdapConfig;
  private readonly timeout: number;

  /**
   * コンストラクタ
   * 注意: 本番環境では createWithDatabaseConfig() を使用してください
   */
  constructor(config?: Partial<OpenLdapConfig>) {
    // 明示的に設定が渡された場合はそれを使用、なければ環境変数をフォールバック
    this.config = {
      serverUrl:
        config?.serverUrl || process.env.OPENLDAP_URL || "ldap://localhost:389",
      adminDN:
        config?.adminDN ||
        process.env.OPENLDAP_ADMIN_DN ||
        "cn=admin,dc=occ,dc=co,dc=jp",
      adminPassword:
        config?.adminPassword || process.env.OPENLDAP_ADMIN_PASSWORD || "admin",
      baseDN:
        config?.baseDN || process.env.OPENLDAP_BASE_DN || "dc=occ,dc=co,dc=jp",
      usersOU:
        config?.usersOU ||
        process.env.OPENLDAP_USERS_OU ||
        "ou=Users,dc=occ,dc=co,dc=jp",
      timeout: config?.timeout || 10000,
    };
    this.timeout = this.config.timeout || 10000;
  }

  /**
   * データベースから設定を読み込んでインスタンスを作成
   * 本番環境ではこのメソッドを使用してください
   */
  static async createWithDatabaseConfig(): Promise<OpenLdapService> {
    const config = await loadOpenLdapConfigFromDatabase();
    return new OpenLdapService(config);
  }

  /**
   * OpenLDAPサーバが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    const client = this.createClient();
    try {
      await this.bind(client, this.config.adminDN, this.config.adminPassword);
      return true;
    } catch {
      return false;
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * OpenLDAPでユーザ認証
   */
  async authenticate(
    username: string,
    password: string,
  ): Promise<OpenLdapAuthResult> {
    const client = this.createClient();
    const userDN = `uid=${username},${this.config.usersOU}`;

    try {
      // ユーザのDNで直接バインドを試行
      // バインド成功 = ユーザ存在 + パスワード正しい
      // バインド失敗 = ユーザ不存在 or パスワード誤り
      await this.bind(client, userDN, password);

      console.log(`[OpenLdapService] Authentication successful: ${username}`);

      // ユーザ属性を取得するために管理者で再接続
      const adminClient = this.createClient();
      let email: string | undefined;
      let displayName: string | undefined;
      let employeeNumber: string | undefined;
      let boxEmployeeId: string | undefined;

      try {
        await this.bind(
          adminClient,
          this.config.adminDN,
          this.config.adminPassword,
        );
        const userInfo = await this.getUser(username);
        if (userInfo.success && userInfo.user) {
          email = userInfo.user.mail;
          displayName = userInfo.user.displayName || userInfo.user.cn;
          employeeNumber = userInfo.user.employeeNumber;
          boxEmployeeId = userInfo.user.boxEmployeeId;
        }
      } catch (attrError) {
        console.warn(
          `[OpenLdapService] Failed to fetch user attributes: ${username}`,
          attrError,
        );
      } finally {
        await this.closeClient(adminClient);
      }

      return {
        success: true,
        username,
        userDN,
        email,
        displayName,
        employeeNumber,
        boxEmployeeId,
      };
    } catch (error) {
      console.error(
        `[OpenLdapService] Authentication failed: ${username}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザが存在するか確認
   */
  async userExists(username: string): Promise<boolean> {
    const client = this.createClient();

    try {
      // 管理者でバインド
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // ユーザを検索
      const userDN = `uid=${username},${this.config.usersOU}`;
      const result = await this.searchEntry(client, userDN);
      return result !== null;
    } catch (error) {
      console.error(`[OpenLdapService] Error checking if user exists:`, error);
      return false;
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザが存在するか確認（既存のクライアントを使用）
   *
   * 検索用に新しいクライアントを作成します。
   */
  private async userExistsWithClient(
    _client: Client,
    username: string,
  ): Promise<boolean> {
    // 検索用に新しいクライアントを作成
    const searchClient = this.createClient();

    try {
      const userDN = `uid=${username},${this.config.usersOU}`;

      // 新しいクライアントで管理者バインド
      await this.bind(
        searchClient,
        this.config.adminDN,
        this.config.adminPassword,
      );

      // 検索実行
      const result = await this.searchEntry(searchClient, userDN);
      return result !== null;
    } catch (error) {
      console.error(`[OpenLdapService] Error checking if user exists:`, error);
      return false;
    } finally {
      await this.closeClient(searchClient);
    }
  }

  /**
   * 新規ユーザを作成
   * @param username - ログインID (uid)
   * @param password - パスワード
   * @param options - オプション属性
   * @param options.displayName - 表示名
   * @param options.email - メールアドレス
   * @param options.employeeNumber - 社員番号
   * @param options.boxEmployeeId - Box Employee ID（CUID、不変の識別子）
   */
  async createUser(
    username: string,
    password: string,
    options?: {
      displayName?: string;
      email?: string;
      employeeNumber?: string;
      boxEmployeeId?: string;
    },
  ): Promise<OpenLdapUserCreateResult> {
    const client = this.createClient();
    const userDN = `uid=${username},${this.config.usersOU}`;

    try {
      // 管理者でバインド
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // Users OUが存在するか確認し、なければ作成
      await this.ensureUsersOU(client);

      // ユーザが既に存在するか確認（既存のクライアントを使用）
      const exists = await this.userExistsWithClient(client, username);
      if (exists) {
        // 既存ユーザのパスワードを更新
        await this.updateUserPassword(username, password);
        return {
          success: true,
          userDN,
        };
      }

      // ユーザエントリを作成 (ldapts - plain object)
      const displayName = options?.displayName;
      const email = options?.email;
      const employeeNumber = options?.employeeNumber;
      const boxEmployeeId = options?.boxEmployeeId;

      const entry: Record<string, string | string[]> = {
        objectClass: ["inetOrgPerson", "organizationalPerson", "person", "top"],
        uid: username,
        cn: displayName || username,
        sn: username,
        userPassword: password,
      };

      if (displayName) {
        entry.displayName = displayName;
      }

      if (email) {
        entry.mail = email;
      }

      if (employeeNumber) {
        entry.employeeNumber = employeeNumber;
      }

      if (boxEmployeeId) {
        entry.boxEmployeeId = boxEmployeeId;
      }

      await this.addEntry(client, userDN, entry);

      console.log(`[OpenLdapService] User created successfully: ${username}`);
      return {
        success: true,
        userDN,
      };
    } catch (error) {
      console.error(
        `[OpenLdapService] Failed to create user: ${username}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザのパスワードを更新 (ldapts)
   */
  async updateUserPassword(
    username: string,
    newPassword: string,
  ): Promise<boolean> {
    const client = this.createClient();
    const userDN = `uid=${username},${this.config.usersOU}`;

    try {
      // 管理者でバインド
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // パスワードを更新 (ldapts Change + Attribute)
      const change = new Change({
        operation: "replace",
        modification: new Attribute({
          type: "userPassword",
          values: [newPassword],
        }),
      });

      await this.modifyEntry(client, userDN, [change]);
      return true;
    } catch (error) {
      console.error(`[OpenLdapService] Failed to update password:`, error);
      return false;
    } finally {
      await this.closeClient(client);
    }
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
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      const users = await this.searchUsers_internal(
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
      console.error("[OpenLdapService] Failed to list users:", error);
      // OUが存在しない場合は空の配列を返す
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
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // uid, cn, mail, displayName, employeeNumber, boxEmployeeId で検索
      const escapedQuery = this.escapeLdapFilter(query);
      const filter = `(&(objectClass=inetOrgPerson)(|(uid=*${escapedQuery}*)(cn=*${escapedQuery}*)(mail=*${escapedQuery}*)(displayName=*${escapedQuery}*)(employeeNumber=*${escapedQuery}*)(boxEmployeeId=*${escapedQuery}*)))`;

      const users = await this.searchUsers_internal(client, filter);

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error(`[OpenLdapService] Failed to search users:`, error);
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
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      const escapedUid = this.escapeLdapFilter(uid);
      const filter = `(&(objectClass=inetOrgPerson)(uid=${escapedUid}))`;

      const users = await this.searchUsers_internal(client, filter);

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
      console.error(`[OpenLdapService] Failed to get user:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザを削除
   */
  async deleteUser(uid: string): Promise<DeleteUserResult> {
    const client = this.createClient();
    const userDN = `uid=${uid},${this.config.usersOU}`;

    try {
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // ユーザが存在するか確認
      const exists = await this.userExistsWithClient(client, uid);
      if (!exists) {
        return {
          success: false,
          error: "User not found",
        };
      }

      await this.deleteEntry(client, userDN);

      console.log(`[OpenLdapService] User deleted: ${uid}`);
      return {
        success: true,
      };
    } catch (error) {
      console.error(`[OpenLdapService] Failed to delete user:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * ユーザ属性を更新
   */
  async updateUser(
    uid: string,
    attributes: Partial<{
      displayName: string;
      mail: string;
      cn: string;
      sn: string;
    }>,
  ): Promise<UpdateUserResult> {
    const client = this.createClient();
    const userDN = `uid=${uid},${this.config.usersOU}`;

    try {
      await this.bind(client, this.config.adminDN, this.config.adminPassword);

      // ユーザが存在するか確認
      const exists = await this.userExistsWithClient(client, uid);
      if (!exists) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const changes: Change[] = [];

      if (attributes.displayName !== undefined) {
        changes.push(
          new Change({
            operation: "replace",
            modification: new Attribute({
              type: "displayName",
              values: [attributes.displayName],
            }),
          }),
        );
      }

      if (attributes.mail !== undefined) {
        changes.push(
          new Change({
            operation: "replace",
            modification: new Attribute({
              type: "mail",
              values: [attributes.mail],
            }),
          }),
        );
      }

      if (attributes.cn !== undefined) {
        changes.push(
          new Change({
            operation: "replace",
            modification: new Attribute({
              type: "cn",
              values: [attributes.cn],
            }),
          }),
        );
      }

      if (attributes.sn !== undefined) {
        changes.push(
          new Change({
            operation: "replace",
            modification: new Attribute({
              type: "sn",
              values: [attributes.sn],
            }),
          }),
        );
      }

      if (changes.length === 0) {
        return {
          success: true,
        };
      }

      await this.modifyEntry(client, userDN, changes);

      console.log(`[OpenLdapService] User updated: ${uid}`);
      return {
        success: true,
      };
    } catch (error) {
      console.error(`[OpenLdapService] Failed to update user:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    } finally {
      await this.closeClient(client);
    }
  }

  /**
   * 内部用: ユーザ検索（複数結果対応）- ldapts Promise版
   */
  private async searchUsers_internal(
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
   * エントリを削除 (ldapts)
   */
  private async deleteEntry(client: Client, dn: string): Promise<void> {
    await client.del(dn);
  }

  /**
   * Users OUが存在することを確認し、なければ作成 (ldapts)
   */
  private async ensureUsersOU(client: Client): Promise<void> {
    try {
      const result = await this.searchEntry(client, this.config.usersOU);
      if (result === null) {
        console.log(
          `[OpenLdapService] Creating Users OU: ${this.config.usersOU}`,
        );
        const entry = {
          objectClass: ["organizationalUnit", "top"],
          ou: "Users",
        };

        await this.addEntry(client, this.config.usersOU, entry);
        console.log(`[OpenLdapService] Users OU created successfully`);
      }
    } catch (error) {
      // OUが存在しない場合も作成を試みる
      const errorName = (error as { name?: string })?.name;
      if (errorName === "NoSuchObjectError") {
        try {
          console.log(
            `[OpenLdapService] Creating Users OU (after NoSuchObject): ${this.config.usersOU}`,
          );
          const entry = {
            objectClass: ["organizationalUnit", "top"],
            ou: "Users",
          };
          await this.addEntry(client, this.config.usersOU, entry);
          console.log(`[OpenLdapService] Users OU created successfully`);
        } catch (addError) {
          // 既に存在する場合は無視
          const addErrorName = (addError as { name?: string })?.name;
          if (addErrorName !== "EntryAlreadyExistsError") {
            console.error(
              `[OpenLdapService] Failed to create Users OU:`,
              addError,
            );
          }
        }
      }
    }
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
   * LDAPバインド (ldapts - Promise native)
   */
  private async bind(
    client: Client,
    dn: string,
    password: string,
  ): Promise<void> {
    await client.bind(dn, password);
  }

  /**
   * エントリを検索 (ldapts - Promise版)
   *
   * ldaptsでは scope: "base" が正しく動作します（ldapjsのバグはありません）
   */
  private async searchEntry(client: Client, dn: string): Promise<Entry | null> {
    try {
      const opts: SearchOptions = {
        filter: "(objectClass=*)",
        scope: "base",
        sizeLimit: 1,
      };

      const { searchEntries } = await client.search(dn, opts);

      if (searchEntries.length === 0) {
        return null;
      }

      return searchEntries[0];
    } catch {
      // NoSuchObjectErrorなどのエラーはnullを返す
      return null;
    }
  }

  /**
   * エントリを追加 (ldapts - plain object版)
   */
  private async addEntry(
    client: Client,
    dn: string,
    entry: Record<string, string | string[]>,
  ): Promise<void> {
    await client.add(dn, entry);
  }

  /**
   * エントリを変更 (ldapts)
   */
  private async modifyEntry(
    client: Client,
    dn: string,
    changes: Change[],
  ): Promise<void> {
    await client.modify(dn, changes);
  }

  /**
   * クライアントを閉じる
   */
  private async closeClient(client: Client): Promise<void> {
    try {
      await client.unbind();
    } catch {
      // unbindエラーは無視（接続が既に切断されている場合など）
    }
  }
}
