import type { Role } from "@prisma/client";
import type { ReactNode } from "react";
import type { MenuGroupId } from "./common";

/**
 * ============================================
 * 新しい型定義（モジュール・メニュー分離）
 * ============================================
 */

/**
 * モジュール（業務単位の大きな塊）
 * 例: 人事評価、組織管理、勤怠管理、経費精算など
 */
export interface AppModule {
  /** モジュールの一意なID */
  id: string;

  /** 表示名（英語） */
  name: string;

  /** 表示名（日本語） */
  nameJa: string;

  /** 説明文（英語） */
  description?: string;

  /** 説明文（日本語） */
  descriptionJa?: string;

  /** モジュールアイコン */
  icon?: ReactNode;

  /** モジュールのテーマカラー */
  color?: string;

  /** このモジュールを有効化するか */
  enabled: boolean;

  /** モジュール表示順序 */
  order: number;

  /**
   * 依存するモジュールのID一覧
   * このモジュールが有効化される前に、依存モジュールが有効化されている必要がある
   */
  dependencies?: string[];

  /** このモジュールに属するメニュー一覧 */
  menus: AppMenu[];

  /** このモジュールが提供するサービス一覧（画面を持たないAPI・ロジック） */
  services?: AppService[];

  /** このモジュールが依存するDockerコンテナ一覧 */
  containers?: ContainerDependency[];

  /** このモジュールが提供するMCPサーバー */
  mcpServer?: McpServer;
}

/**
 * コンテナ依存関係（Dockerコンテナへの依存を定義）
 *
 * モジュールが正常に動作するために必要なDockerコンテナを定義します。
 * 例: OpenLDAPモジュールはopenldapコンテナに依存
 */
export interface ContainerDependency {
  /** コンテナの一意なID */
  id: string;

  /** 表示名（英語） */
  name: string;

  /** 表示名（日本語） */
  nameJa: string;

  /** ヘルスチェック用APIエンドポイント */
  healthCheckUrl: string;

  /** 必須かどうか（falseの場合は任意依存） */
  required: boolean;

  /** 説明文（英語） */
  description?: string;

  /** 説明文（日本語） */
  descriptionJa?: string;
}

/**
 * MCPサーバー（外部AI連携用サーバー）
 *
 * モジュールが提供するMCPサーバーを定義します。
 * 外部の生成AIからモジュールの機能を利用可能にします。
 */
export interface McpServer {
  /** MCPサーバーの一意なID */
  id: string;

  /** 表示名（英語） */
  name: string;

  /** 表示名（日本語） */
  nameJa: string;

  /** 説明文（英語） */
  description?: string;

  /** 説明文（日本語） */
  descriptionJa?: string;

  /** MCPサーバーのディレクトリパス（プロジェクトルートからの相対パス） */
  path: string;

  /** 提供するツール数 */
  toolCount: number;

  /** 読み取り専用かどうか */
  readOnly: boolean;
}

/**
 * サービス（画面を持たないAPI・ビジネスロジック）
 * 例: 承認経路取得、ワークフロー管理、通知送信など
 *
 * メニューとの違い:
 * - メニュー: 画面（UI）を持つ機能。サイドバーに表示され、ユーザーが直接アクセスする
 * - サービス: 画面を持たないAPIやビジネスロジック。他のモジュールから呼び出される
 */
export interface AppService {
  /** サービスの一意なID */
  id: string;

  /** 所属するモジュールのID */
  moduleId: string;

  /** 表示名（英語） */
  name: string;

  /** 表示名（日本語） */
  nameJa: string;

  /** 説明文（英語） */
  description?: string;

  /** 説明文（日本語） */
  descriptionJa?: string;

  /** APIエンドポイント一覧（ある場合） */
  apiEndpoints?: string[];

  /** このサービスを有効化するか */
  enabled: boolean;
}

/**
 * メニュー（機能単位・権限単位の小さな塊）
 * 例: マイ評価、評価管理、組織図、データインポートなど
 */
export interface AppMenu {
  /** メニューの一意なID */
  id: string;

  /** 所属するモジュールのID */
  moduleId: string;

  /** 表示名（英語） */
  name: string;

  /** 表示名（日本語） */
  nameJa: string;

  /** ルートパス */
  path: string;

  /** メニューアイコン（未指定の場合はモジュールのアイコンを継承） */
  icon?: ReactNode;

  /** このメニューを有効化するか */
  enabled: boolean;

  /** メニュー表示順序（モジュール内での順序） */
  order: number;

  /** メニューグループ（UIでの表示先） */
  menuGroup: MenuGroupId;

  /** 必要なロール（いずれか一つ） */
  requiredRoles?: Role[];

  /** 必要な権限（APIキーベース） */
  requiredPermissions?: string[];

  /** 必要な役職（いずれか一つ） */
  requiredPositions?: string[];

  /** 必要なアクセスキー（名前で指定） */
  requiredAccessKey?: string;

  /** 説明文（英語） */
  description?: string;

  /** 説明文（日本語） */
  descriptionJa?: string;

  /** 実装済みかどうか（未実装の場合は視覚的に区別される） */
  isImplemented?: boolean;

  /** Access Keyによって許可されたメニューかどうか */
  isAccessKeyGranted?: boolean;

  /** サブメニュー（ネストされたメニュー） */
  children?: AppMenu[];
}

/**
 * メニューグループの定義
 * サイドバーでの表示グループ
 */
export interface MenuGroup {
  id: string;
  name: string;
  nameJa: string;
  color?: string;
  order: number;
}

/**
 * モジュールレジストリの型
 */
export type ModuleRegistry = Record<string, AppModule>;

/**
 * ============================================
 * 旧型定義（後方互換性のため一時的に残す）
 * @deprecated 新しいAppModule/AppMenu型を使用してください
 * ============================================
 */

/**
 * @deprecated Use AppMenu instead
 */
export interface LegacyAppModule {
  id: string;
  name: string;
  nameJa: string;
  icon: ReactNode;
  path: string;
  menuGroup: MenuGroupId;
  requiredRoles?: Role[];
  requiredPermissions?: string[];
  requiredPositions?: string[];
  order: number;
  description?: string;
  enabled: boolean;
}
