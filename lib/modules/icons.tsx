/**
 * モジュール・メニューアイコンの一元管理
 *
 * このファイルですべてのモジュール/メニューアイコンを定義します。
 * モジュール定義（module.tsx）とモジュール管理画面（ModuleManagementClient.tsx）の両方から
 * このファイルを参照することで、アイコンの一貫性を保ちます。
 *
 * アイコンを変更する場合は、このファイルを編集するだけで
 * すべての場所（サイドバー、モジュール管理画面）に反映されます。
 */

import type { ReactElement } from "react";
import { RiShieldUserLine } from "react-icons/ri";

/**
 * アイコンのSVGパス定義
 * 各モジュール/メニューのアイコンパスを定義
 */
export const iconPaths = {
  // === モジュールアイコン ===

  // 生成AI - チャットアイコン（シンプルな吹き出し）
  generativeAI:
    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",

  // システム - シールドアイコン
  system:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",

  // 組織 - ビルアイコン
  organization:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",

  // 人事評価 - スターアイコン
  hrEvaluation:
    "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",

  // バックオフィス - ドキュメントアイコン
  backoffice:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",

  // スケジュール - カレンダーアイコン
  schedule:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",

  // === メニュー固有アイコン ===

  // ダッシュボード - ホームアイコン
  dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",

  // 管理パネル - チャートアイコン
  adminPanel:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",

  // アクセスキー管理 - キーアイコン
  accessKeyManagement:
    "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",

  // データ履歴 - 時計アイコン
  dataHistory: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",

  // 組織データ管理 - データベースとユーザーアイコン
  dataManagement:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",

  // 組織図 - 組織階層アイコン
  organizationChart:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",

  // ページ案内 - メガホンアイコン
  pageAnnouncements:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",

  // 社内チケット販売 - モジュールアイコン（総）を継承するため削除
  // ticketSalesAdmin: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",

  // カレンダー - カレンダーアイコン（スケジュールと同じ）
  myCalendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",

  // デフォルト - グリッドアイコン
  default:
    "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
} as const;

export type IconName = keyof typeof iconPaths;

/**
 * テキストベースのアイコン（漢字1文字など）
 * モジュール名を表す漢字アイコン用
 */
export const textIcons: Record<string, string> = {
  generalAffairs: "総", // 総務庶務
  hrManagement: "人", // 人事労務
  finance: "財", // 財務会計
} as const;

/**
 * React-iconsを使用するモジュール
 * react-iconsライブラリのアイコンを使用
 */
export const reactIcons: Record<string, (className: string) => ReactElement> = {
  openldap: (className) => <RiShieldUserLine className={className} />,
} as const;

/**
 * アイコンパスからSVG要素を生成
 */
export function createIcon(
  pathOrName: string,
  className = "w-5 h-5",
  key?: string,
): ReactElement {
  // アイコン名が渡された場合はパスを取得
  const path =
    pathOrName in iconPaths ? iconPaths[pathOrName as IconName] : pathOrName;

  return (
    <svg
      key={key}
      className={`${className} flex-shrink-0`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        key={key ? `${key}-path` : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={path}
      />
    </svg>
  );
}

/**
 * テキストアイコン（漢字1文字）を生成
 */
export function createTextIcon(
  text: string,
  className = "w-5 h-5",
  key?: string,
): ReactElement {
  return (
    <span
      key={key}
      className={`${className} flex-shrink-0 flex items-center justify-center font-bold text-sm`}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

/**
 * モジュールIDからアイコンを取得
 * @param moduleId モジュールID
 * @param className CSSクラス（デフォルト: "w-5 h-5"）
 */
export function getModuleIcon(
  moduleId: string,
  className = "w-6 h-6",
): ReactElement {
  // React-iconsがあればそれを使用
  if (moduleId in reactIcons) {
    return reactIcons[moduleId](className);
  }

  // テキストアイコンがあればそれを使用
  if (moduleId in textIcons) {
    return createTextIcon(textIcons[moduleId], className, `${moduleId}-icon`);
  }

  const path = iconPaths[moduleId as IconName] || iconPaths.default;
  return createIcon(path, className, `${moduleId}-icon`);
}

/**
 * メニューIDからアイコンを取得
 * メニュー固有のアイコンがない場合は、モジュールアイコンにフォールバック
 * @param menuId メニューID
 * @param moduleId 親モジュールのID
 * @param className CSSクラス（デフォルト: "w-5 h-5"）
 */
export function getMenuIcon(
  menuId: string,
  moduleId: string,
  className = "w-5 h-5",
): ReactElement {
  // メニュー固有のアイコンがあればそれを使用
  if (menuId in iconPaths) {
    return createIcon(
      iconPaths[menuId as IconName],
      className,
      `${menuId}-icon`,
    );
  }

  // なければモジュールのアイコンを継承（テキストアイコン含む）
  return getModuleIcon(moduleId, className);
}
