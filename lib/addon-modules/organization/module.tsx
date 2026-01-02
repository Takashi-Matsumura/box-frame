/**
 * 会社組織モジュール
 *
 * 組織構成（本部・部・課）と社員データを管理するモジュール
 */

import type { AppModule } from "@/types/module";
import { getModuleIcon, getMenuIcon } from "@/lib/modules/icons";

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
      id: "dataManagement",
      moduleId: "organization",
      name: "Organization Data Management",
      nameJa: "組織データ管理",
      path: "/admin/data-management",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 80,
      icon: getMenuIcon("dataManagement", "organization"),
      description: "Import and manage organization data",
      descriptionJa: "組織データのインポートと管理",
      isImplemented: true,
    },
  ],
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
