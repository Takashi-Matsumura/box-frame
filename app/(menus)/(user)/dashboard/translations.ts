import { appConfig } from "@/lib/config/app";

export const dashboardTranslations = {
  en: {
    title: "Dashboard",
    welcomeBack: "Welcome back",
    roleLabel: "Role",
    today: "Today",
    // Message Section
    messageTitle: "About This Application",
    messageDescription: `${appConfig.name} is a ${appConfig.description.toLowerCase()}. Add menus and features through plugins, and manage access control based on roles.`,
    featureModular: "Modular Architecture",
    featureModularDesc: "Extend menus and features via plugins",
    featureRoles: "Role-Based Access",
    featureRolesDesc: "Control page access by role",
    featureLdap: "OpenLDAP Integration",
    featureLdapDesc: "Enterprise-grade authentication",
    featureI18n: "Multi-Language",
    featureI18nDesc: "Switch between Japanese and English",
    // Component Demo Section
    componentDemoTitle: "UI Component Showcase",
    componentDemoDescription:
      "This application uses shadcn/ui components. Below are examples of available components.",
    demoButtons: "Buttons",
    demoBadges: "Badges",
    demoAlerts: "Alerts",
    demoCards: "Cards",
    demoInputs: "Form Inputs",
    alertInfoTitle: "Information",
    alertInfoDesc: "This is an informational alert.",
    alertWarningTitle: "Warning",
    alertWarningDesc: "Please review before proceeding.",
    alertSuccessTitle: "Success",
    alertSuccessDesc: "Operation completed successfully.",
    cardTitle: "Sample Card",
    cardDescription: "Cards can contain any content.",
    cardContent: "This is a sample card using shadcn/ui Card component.",
  },
  ja: {
    title: "ダッシュボード",
    welcomeBack: "お帰りなさい",
    roleLabel: "ロール",
    today: "今日",
    // Message Section
    messageTitle: "このアプリケーションについて",
    messageDescription: `${appConfig.name}は、${appConfig.descriptionJa}です。プラグイン形式でメニューと機能を拡張し、ロールに応じたアクセス制御を行います。`,
    featureModular: "モジュラーアーキテクチャ",
    featureModularDesc: "プラグイン形式でメニューと機能を拡張",
    featureRoles: "権限ベースのアクセス制御",
    featureRolesDesc: "ロールに応じたページアクセス制御",
    featureLdap: "OpenLDAP統合",
    featureLdapDesc: "エンタープライズ向け認証基盤",
    featureI18n: "多言語対応",
    featureI18nDesc: "日本語・英語切り替え",
    // Component Demo Section
    componentDemoTitle: "UIコンポーネント ショーケース",
    componentDemoDescription:
      "このアプリケーションではshadcn/uiコンポーネントを使用しています。以下は利用可能なコンポーネントの例です。",
    demoButtons: "ボタン",
    demoBadges: "バッジ",
    demoAlerts: "アラート",
    demoCards: "カード",
    demoInputs: "フォーム入力",
    alertInfoTitle: "情報",
    alertInfoDesc: "これは情報アラートです。",
    alertWarningTitle: "警告",
    alertWarningDesc: "続行する前に確認してください。",
    alertSuccessTitle: "成功",
    alertSuccessDesc: "操作が正常に完了しました。",
    cardTitle: "サンプルカード",
    cardDescription: "カードには任意のコンテンツを含められます。",
    cardContent:
      "これはshadcn/ui Cardコンポーネントを使用したサンプルカードです。",
  },
} as const;

export type DashboardTranslationKey = keyof typeof dashboardTranslations.en;
