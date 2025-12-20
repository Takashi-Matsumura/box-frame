/**
 * マネージャー向けテンプレートページの翻訳定義
 */
export const templateManagerTranslations = {
  en: {
    title: "Template Manager",
    pageTitle: "Template Manager Page",
    description: "This is a template page for manager-level features.",
    welcomeMessage: "Welcome to the Manager Template!",
    features: "Manager Features",
    featureList: [
      "Accessible by MANAGER and ADMIN roles",
      "Suitable for team management features",
      "Analytics and reporting dashboards",
      "Approval workflows",
    ],
    example: "Example Use Cases",
    exampleList: [
      "Team performance dashboard",
      "Leave request approvals",
      "Project status overview",
      "Resource allocation",
    ],
  },
  ja: {
    title: "テンプレート管理",
    pageTitle: "マネージャー向けテンプレートページ",
    description: "マネージャーレベルの機能を作成するためのテンプレートページです。",
    welcomeMessage: "マネージャーテンプレートへようこそ！",
    features: "マネージャー向け機能",
    featureList: [
      "MANAGERとADMINロールがアクセス可能",
      "チーム管理機能に適している",
      "分析・レポートダッシュボード",
      "承認ワークフロー",
    ],
    example: "使用例",
    exampleList: [
      "チームパフォーマンスダッシュボード",
      "休暇申請の承認",
      "プロジェクト状況の概要",
      "リソース配分",
    ],
  },
} as const;
