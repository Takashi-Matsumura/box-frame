import { getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

/**
 * OpenLDAP管理モジュール
 *
 * OpenLDAPサーバの管理機能を提供します。
 * - ユーザ管理（作成・編集・削除）
 * - サーバ設定
 * - 接続テスト
 */
export const openldapModule: AppModule = {
  id: "openldap",
  name: "OpenLDAP",
  nameJa: "OpenLDAP",
  description: "OpenLDAP server management and user administration",
  descriptionJa: "OpenLDAPサーバの管理とユーザ管理を行います",
  dependencies: ["system"],
  icon: getModuleIcon("openldap"),
  enabled: true,
  order: 100,
  menus: [
    {
      id: "openldapManagement",
      moduleId: "openldap",
      name: "OpenLDAP Settings",
      nameJa: "OpenLDAP設定",
      path: "/admin/openldap",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 50,
      description: "Manage OpenLDAP server and users",
      descriptionJa: "OpenLDAPサーバとユーザを管理します",
    },
  ],
  containers: [
    {
      id: "openldap",
      name: "OpenLDAP Server",
      nameJa: "OpenLDAPサーバ",
      healthCheckUrl: "/api/admin/openldap/status",
      required: true,
      description: "LDAP authentication server container",
      descriptionJa: "LDAP認証サーバコンテナ",
    },
  ],
  mcpServer: {
    id: "openldap-mcp",
    name: "OpenLDAP MCP Server",
    nameJa: "OpenLDAP MCPサーバ",
    description: "Provides read-only access to LDAP user information for external AI",
    descriptionJa: "外部AIからLDAPユーザ情報への読み取り専用アクセスを提供",
    path: "mcp-servers/openldap",
    toolCount: 5,
    readOnly: true,
    tools: [
      { name: "ldap_check_status", descriptionJa: "サーバ接続状態を確認" },
      { name: "ldap_list_users", descriptionJa: "ユーザ一覧を取得" },
      { name: "ldap_get_user", descriptionJa: "ユーザ詳細を取得" },
      { name: "ldap_search_users", descriptionJa: "ユーザを検索" },
      { name: "ldap_user_exists", descriptionJa: "ユーザ存在確認" },
    ],
  },
};
