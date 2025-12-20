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
