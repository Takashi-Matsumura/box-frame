/**
 * 会社組織モジュール
 *
 * 組織構成（本部・部・課）と社員データを管理するモジュール
 */

import { FaHistory, FaSitemap, FaUpload, FaUsers } from "react-icons/fa";
import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule, AppTab } from "@/types/module";

/**
 * 組織データ管理タブ定義
 */
const dataManagementTabs: AppTab[] = [
  {
    id: "import",
    name: "Import",
    nameJa: "インポート",
    icon: <FaUpload className="w-5 h-5" />,
    order: 1,
    enabled: true,
    allowAccessKey: true,
    description: "Import organization data from CSV/Excel",
    descriptionJa: "CSV/Excelから組織データをインポート",
  },
  {
    id: "employees",
    name: "Employees",
    nameJa: "社員一覧",
    icon: <FaUsers className="w-5 h-5" />,
    order: 3,
    enabled: true,
    allowAccessKey: true,
    description: "View and manage employee list",
    descriptionJa: "社員一覧の表示と管理",
  },
  {
    id: "organize",
    name: "Organize",
    nameJa: "組織整備",
    icon: <FaSitemap className="w-5 h-5" />,
    order: 2,
    enabled: true,
    allowAccessKey: true,
    description: "Configure organization structure and managers",
    descriptionJa: "組織構造と責任者の設定",
  },
  {
    id: "history",
    name: "History",
    nameJa: "履歴",
    icon: <FaHistory className="w-5 h-5" />,
    order: 4,
    enabled: true,
    allowAccessKey: true,
    description: "View organization change history",
    descriptionJa: "組織変更履歴の表示",
  },
];

export const organizationModule: AppModule = {
  id: "organization",
  name: "Organization",
  nameJa: "会社組織",
  description: "Manage company organization structure and employee data",
  descriptionJa: "会社の組織構成と社員データを管理します",
  icon: getModuleIcon("organization"),
  enabled: true,
  order: 20,
  dependencies: ["system"],
  menus: [
    {
      id: "organizationChart",
      moduleId: "organization",
      name: "Organization Chart",
      nameJa: "組織図",
      path: "/organization-chart",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 10,
      icon: getMenuIcon("organizationChart", "organization"),
      description: "View organization structure and employees",
      descriptionJa: "組織構造と社員を閲覧",
      isImplemented: true,
    },
    {
      id: "dataManagement",
      moduleId: "organization",
      name: "Organization Data Management",
      nameJa: "組織データ管理",
      path: "/admin/data-management",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 80,
      mobileEnabled: false,
      icon: getMenuIcon("dataManagement", "organization"),
      description: "Import and manage organization data",
      descriptionJa: "組織データのインポートと管理",
      isImplemented: true,
      tabs: dataManagementTabs,
      allowAccessKey: true,
    },
  ],
  mcpServer: {
    id: "organization-mcp",
    name: "Organization MCP Server",
    nameJa: "会社組織MCPサーバ",
    description:
      "Provides read-only access to organization structure and employee data for external AI",
    descriptionJa:
      "外部AIから組織構造と社員データへの読み取り専用アクセスを提供",
    path: "mcp-servers/organization",
    toolCount: 6,
    readOnly: true,
    tools: [
      { name: "org_check_status", descriptionJa: "DB接続状態を確認" },
      {
        name: "org_get_structure",
        descriptionJa: "組織階層ツリーを取得",
      },
      {
        name: "org_list_departments",
        descriptionJa: "本部一覧を取得",
      },
      {
        name: "org_list_employees",
        descriptionJa: "社員一覧を取得",
      },
      { name: "org_get_employee", descriptionJa: "社員詳細を取得" },
      {
        name: "org_search_employees",
        descriptionJa: "社員を検索",
      },
    ],
  },
  services: [
    {
      id: "organizationImport",
      moduleId: "organization",
      name: "Organization Import",
      nameJa: "組織データインポート",
      description: "Import organization and employee data from CSV/Excel",
      descriptionJa: "CSV/Excelから組織・社員データをインポート",
      apiEndpoints: [
        "/api/admin/organization/import",
        "/api/admin/organization/import/preview",
      ],
      enabled: true,
    },
    {
      id: "organizationHistory",
      moduleId: "organization",
      name: "Organization History",
      nameJa: "組織履歴管理",
      description: "Track changes in organization structure and employees",
      descriptionJa: "組織構造と社員の変更履歴を追跡",
      apiEndpoints: ["/api/admin/organization/history"],
      enabled: true,
    },
  ],
};
