/**
 * バックオフィスモジュール
 *
 * アクセスキーが必要な「鍵付きモジュール」
 * 特定のユーザーにのみ公開される機能を提供
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const backofficeModule: AppModule = {
  id: "backoffice",
  name: "Back Office",
  nameJa: "バックオフィス",
  description: "Access-key protected features for authorized users",
  descriptionJa: "アクセスキーで保護された機能（許可されたユーザーのみ）",
  icon: getModuleIcon("backoffice"),
  enabled: true,
  order: 40,
  menus: [
    {
      id: "businessAnalytics",
      moduleId: "backoffice",
      name: "Business Analytics",
      nameJa: "業務分析",
      path: "/backoffice/analytics",
      menuGroup: "backoffice",
      // requiredRolesは設定しない（アクセスキーでのみアクセス可能）
      // ADMINロールはaccess-control.tsでスキップされる
      requiredAccessKey: "backoffice",
      enabled: true,
      order: 10,
      icon: getMenuIcon("backoffice", "backoffice"),
      description: "Business analytics and reports",
      descriptionJa: "業務分析とレポート機能",
      isImplemented: true,
    },
  ],
};
