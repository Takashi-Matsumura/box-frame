import {
  FaBullhorn,
  FaClipboardList,
  FaInfoCircle,
  FaUsers,
} from "react-icons/fa";
import type { AppModule, AppTab } from "@/types/module";

/**
 * 管理画面のタブ定義
 */
const adminTabs: AppTab[] = [
  {
    id: "system",
    name: "System Information",
    nameJa: "システム情報",
    icon: <FaInfoCircle className="w-5 h-5" />,
    order: 1,
    enabled: true,
    allowAccessKey: false, // システム情報は機密性が高い
    description: "View system information and settings",
    descriptionJa: "システム情報と設定を表示します",
  },
  {
    id: "users",
    name: "User Management",
    nameJa: "ユーザ管理",
    icon: <FaUsers className="w-5 h-5" />,
    order: 2,
    enabled: true,
    allowAccessKey: true,
    description: "Manage system users",
    descriptionJa: "システムユーザを管理します",
  },
  {
    id: "access-keys",
    name: "Access Keys",
    nameJa: "アクセスキー",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
    order: 3,
    enabled: true,
    allowAccessKey: false, // アクセスキー管理自体は委譲不可
    description: "Manage access keys and permissions",
    descriptionJa: "アクセスキーと権限を管理します",
  },
  {
    id: "modules",
    name: "Module Management",
    nameJa: "モジュール管理",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    order: 4,
    enabled: true,
    allowAccessKey: false, // モジュール管理は機密性が高い
    description: "Manage system modules",
    descriptionJa: "システムモジュールを管理します",
  },
  {
    id: "audit-logs",
    name: "Audit Logs",
    nameJa: "監査ログ",
    icon: <FaClipboardList className="w-5 h-5" />,
    order: 5,
    enabled: true,
    allowAccessKey: true,
    description: "View audit logs",
    descriptionJa: "監査ログを表示します",
  },
  {
    id: "announcements",
    name: "Announcements",
    nameJa: "アナウンス",
    icon: <FaBullhorn className="w-5 h-5" />,
    order: 6,
    enabled: true,
    allowAccessKey: true,
    description: "Manage system announcements",
    descriptionJa: "システムアナウンスを管理します",
  },
];

/**
 * システム管理モジュール
 *
 * システムの基本機能と管理機能を提供します。
 * - 全社員: ダッシュボード
 * - 管理者: システム環境（ユーザ管理、モジュール管理、アクセスキー管理等）
 */
export const systemModule: AppModule = {
  id: "system",
  name: "System",
  nameJa: "システム",
  description: "System management and administration",
  descriptionJa: "システム管理と運用を行います",
  dependencies: [], // コアモジュール：依存なし
  icon: (
    <svg
      key="system-icon"
      className="w-5 h-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        key="icon-path"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  ),
  enabled: true,
  order: 10,
  menus: [
    {
      id: "dashboard",
      moduleId: "system",
      name: "Dashboard",
      nameJa: "ダッシュボード",
      path: "/dashboard",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "ADMIN"],
      enabled: true,
      order: 0,
      description: "View your personal dashboard",
      descriptionJa: "個人ダッシュボードを表示します",
      icon: (
        <svg
          key="dashboard-icon"
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            key="icon-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "adminPanel",
      moduleId: "system",
      name: "System Environment",
      nameJa: "システム環境",
      path: "/admin",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 90,
      description: "Manage system environment and settings",
      descriptionJa: "システム環境を管理します",
      icon: (
        <svg
          key="adminPanel-icon"
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            key="icon-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      tabs: adminTabs,
      allowAccessKey: false, // メニュー全体ではなくタブ単位で制御
    },
  ],
};
