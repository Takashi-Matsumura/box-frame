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
export declare class LdapClient {
  private config;
  private readonly timeout;
  constructor(config: LdapConfig);
  /**
   * 環境変数から設定を読み込んでインスタンスを作成
   */
  static createFromEnv(): LdapClient;
  /**
   * OpenLDAPサーバが利用可能かチェック
   */
  isAvailable(): Promise<boolean>;
  /**
   * サーバー情報を取得
   */
  getServerInfo(): {
    url: string;
    baseDN: string;
    usersOU: string;
  };
  /**
   * ユーザ一覧を取得
   */
  listUsers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ListUsersResult>;
  /**
   * ユーザを検索
   */
  searchUsers(query: string): Promise<SearchUsersResult>;
  /**
   * ユーザ詳細を取得
   */
  getUser(uid: string): Promise<GetUserResult>;
  /**
   * ユーザが存在するか確認
   */
  userExists(uid: string): Promise<boolean>;
  /**
   * 内部用: ユーザ検索
   */
  private searchUsersInternal;
  /**
   * LDAPフィルター用にエスケープ
   */
  private escapeLdapFilter;
  /**
   * LDAPクライアントを作成
   */
  private createClient;
  /**
   * クライアントを閉じる
   */
  private closeClient;
}
