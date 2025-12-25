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
};
