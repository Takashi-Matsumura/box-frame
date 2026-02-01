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
    {
      id: "aiBusinessAnalysis",
      moduleId: "backoffice",
      name: "AI Business Analysis",
      nameJa: "AI業務分析",
      path: "/backoffice/ai-analytics",
      menuGroup: "backoffice",
      requiredAccessKey: "backoffice",
      enabled: true,
      order: 15,
      icon: getMenuIcon("backoffice", "backoffice"),
      description: "AI-powered job description generation and editing",
      descriptionJa: "AIによる業務分掌の自動生成・編集",
      isImplemented: true,
    },
    {
      id: "ticketSales",
      moduleId: "backoffice",
      name: "Internal Ticket Sales",
      nameJa: "社内チケット販売",
      path: "/backoffice/ticket-sales",
      menuGroup: "backoffice",
      requiredAccessKey: "backoffice",
      enabled: true,
      order: 20,
      icon: getMenuIcon("backoffice", "backoffice"),
      description: "Manage internal ticket sales, customers, and products",
      descriptionJa: "社内チケット販売、顧客、商品を管理します",
      isImplemented: true,
      tabs: [
        { id: "customers", name: "Customers", nameJa: "顧客管理", order: 1 },
        { id: "products", name: "Products", nameJa: "商品管理", order: 2 },
        { id: "sales", name: "Sales Records", nameJa: "販売記録", order: 3 },
        { id: "api", name: "API Settings", nameJa: "API設定", order: 4 },
      ],
    },
  ],
};
