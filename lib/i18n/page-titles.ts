/**
 * Page title translations for header display
 */
export const pageTitles = {
  en: {
    "/": "Home",
    "/login": "Login",
    "/dashboard": "Dashboard",
    "/profile": "Profile",
    "/settings": "Settings",
    "/access-keys": "Access Key Management",
    "/reports": "Reports",
    "/analytics": "Organization Analytics",
    "/advanced-settings": "Advanced Settings",
    "/organization": "Data Import",
    "/manager/bi": "Business Intelligence",
    "/manager/hr-evaluation": "HR Evaluation",
    "/hr-evaluation": "HR Evaluation",
    "/hr-evaluation/[id]": "HR Evaluation",
    "/manager/evaluation-reports": "Evaluation Reports",
    "/evaluation-reports": "Evaluation Reports",
    "/manager/organization-chart": "Organization Chart",
    "/manager/custom-evaluation": "Custom Evaluation",
    "/manager/custom-evaluation/change-evaluator/[employeeId]":
      "Change Evaluator",
    "/manager/custom-evaluation/add-relation": "Add Custom Relation",
    "/custom-evaluation": "Evaluation Relations",
    "/backoffice/business-trip": "Business Trip Request",
    "/backoffice/expense-claim": "Expense Claim",
    "/admin": "System Environment",
    "/admin/users": "User Management",
    "/admin/access-keys": "Access Key Management",
    "/data-import": "Data Import",
    "/data-history": "Data History",
    "/evaluation-master": "Evaluation Settings",
    "/user/my-evaluation": "My Evaluation",
    "/user/my-evaluation/[periodId]/detail": "Evaluation Details",
    "/organization-chart": "Organization Chart",
    "/user/calendar": "My Calendar",
    "/user/calendar/new": "My Calendar",
    "/user/calendar/daily-report": "My Calendar",
    "/user/ai-chat": "AI Chat",
    "/backoffice/resource-management": "Resource Management",
    "/backoffice/resource-management/meeting-rooms": "Resource Management",
    "/backoffice/resource-management/meeting-rooms/[id]": "Resource Management",
    "/backoffice/resource-management/equipment": "Resource Management",
    "/backoffice/resource-management/vehicles": "Resource Management",
    "/backoffice/company-events": "Company Events",
    "/backoffice/page-announcements": "Page Announcements",
    "/backoffice/ticket-sales": "Internal Ticket Sales",
    "/backoffice/ai-business-analysis": "AI Business Analysis",
    "/admin/openldap": "OpenLDAP",
  },
  ja: {
    "/": "ホーム",
    "/login": "ログイン",
    "/dashboard": "ダッシュボード",
    "/profile": "プロフィール",
    "/settings": "設定",
    "/access-keys": "アクセスキー管理",
    "/reports": "レポート",
    "/analytics": "組織分析",
    "/advanced-settings": "高度な設定",
    "/organization": "データインポート",
    "/manager/bi": "ビジネスインテリジェンス",
    "/manager/hr-evaluation": "人事評価",
    "/hr-evaluation": "人事評価",
    "/hr-evaluation/[id]": "人事評価",
    "/manager/evaluation-reports": "評価レポート",
    "/evaluation-reports": "評価レポート",
    "/manager/organization-chart": "組織図",
    "/manager/custom-evaluation": "評価関係一覧",
    "/manager/custom-evaluation/change-evaluator/[employeeId]": "評価者変更",
    "/manager/custom-evaluation/add-relation": "カスタム評価関係追加",
    "/custom-evaluation": "評価関係一覧",
    "/backoffice/business-trip": "出張申請",
    "/backoffice/expense-claim": "経費精算",
    "/admin": "システム環境",
    "/admin/users": "ユーザ管理",
    "/admin/access-keys": "アクセスキー管理",
    "/data-import": "データインポート",
    "/data-history": "データ履歴",
    "/evaluation-master": "評価環境管理",
    "/user/my-evaluation": "わたしの評価",
    "/user/my-evaluation/[periodId]/detail": "評価詳細",
    "/organization-chart": "組織図",
    "/user/calendar": "わたしのカレンダー",
    "/user/calendar/new": "わたしのカレンダー",
    "/user/calendar/daily-report": "わたしのカレンダー",
    "/user/ai-chat": "AIチャット",
    "/backoffice/resource-management": "リソース管理",
    "/backoffice/resource-management/meeting-rooms": "リソース管理",
    "/backoffice/resource-management/meeting-rooms/[id]": "リソース管理",
    "/backoffice/resource-management/equipment": "リソース管理",
    "/backoffice/resource-management/vehicles": "リソース管理",
    "/backoffice/company-events": "会社イベント",
    "/backoffice/page-announcements": "ページ案内",
    "/backoffice/ticket-sales": "社内チケット販売",
    "/backoffice/ai-business-analysis": "AI業務分析",
    "/admin/openldap": "OpenLDAP",
  },
} as const;

/**
 * Page description translations for info modal
 */
export const pageDescriptions = {
  en: {
    "/": "BoX (BackOffice Transformation) aggregates data from internal systems and provides visualization. Modules run on the frame to support various backoffice operations.",
    "/dashboard":
      "View your personalized dashboard with key metrics and shortcuts",
    "/profile": "Manage your profile information and preferences",
    "/settings": "Configure your account settings and preferences",
    "/access-keys": "Manage your access keys for additional features",
    "/reports": "View and generate various reports",
    "/analytics":
      "Strategic insights from organizational data including structure, demographics, and cost analysis",
    "/advanced-settings": "Configure advanced system settings",
    "/organization":
      "Import organization structure and employee data from CSV/XLSX files",
    "/manager/bi": "Access business intelligence tools and insights",
    "/manager/hr-evaluation": "Manage employee performance evaluations",
    "/hr-evaluation": "Manage employee performance evaluations",
    "/manager/evaluation-reports":
      "Department and individual evaluation analysis reports",
    "/evaluation-reports":
      "Department and individual evaluation analysis reports",
    "/manager/organization-chart":
      "View company organization structure and employee information",
    "/manager/custom-evaluation":
      "Manage custom evaluator-evaluatee relationships for exceptional cases",
    "/custom-evaluation":
      "Review and approve evaluation relationships for departments",
    "/backoffice/business-trip": "Submit and manage business trip requests",
    "/backoffice/expense-claim": "Submit and track expense claims",
    "/admin": "System environment and configuration management",
    "/admin/users": "Manage user accounts and permissions",
    "/admin/access-keys": "Manage access keys for enhanced features",
    "/data-import": "Import employee and organization data from CSV/XLSX files",
    "/data-history": "View and manage data change history and snapshots",
    "/evaluation-master":
      "Manage evaluation periods, weights, growth categories, and evaluation relationships",
    "/user/my-evaluation": "View and manage your performance evaluations",
    "/organization-chart":
      "View company organization structure and employee information",
    "/user/calendar":
      "View and manage your personal calendar and company events",
    "/user/ai-chat":
      "Chat with local LLM powered by llama.cpp. Your conversations are processed on your local machine without sending data to external servers.",
    "/backoffice/resource-management":
      "Manage meeting rooms, equipment, and company vehicles",
    "/backoffice/resource-management/meeting-rooms":
      "Reserve and manage meeting rooms",
    "/backoffice/resource-management/meeting-rooms/[id]":
      "View meeting room details and availability calendar",
    "/backoffice/resource-management/equipment":
      "Manage projectors, laptops, and other equipment",
    "/backoffice/resource-management/vehicles":
      "Reserve and manage company vehicles",
    "/backoffice/company-events":
      "Manage company-wide events, announcements, and holiday calendar",
    "/backoffice/page-announcements":
      "Manage page-specific announcements, tips, FAQs, and guides for users",
    "/backoffice/ticket-sales":
      "Manage internal ticket sales, customers, and products",
    "/backoffice/ai-business-analysis":
      "Analyze business processes through AI dialogue to create job descriptions and workflow diagrams",
    "/admin/openldap":
      "Manage OpenLDAP users, migrate from existing LDAP servers, and configure OpenLDAP settings",
  },
  ja: {
    "/": "BoX（BackOffice Transformation）は社内システムのデータを集約し可視化します。フレーム上でモジュールが動作し、様々なバックオフィス業務をサポートします。",
    "/dashboard":
      "主要な指標とショートカットを含むパーソナライズされたダッシュボードを表示",
    "/profile": "プロフィール情報と設定を管理",
    "/settings": "アカウント設定と環境設定を構成",
    "/access-keys": "追加機能のためのアクセスキーを管理",
    "/reports": "各種レポートの表示と生成",
    "/analytics":
      "組織構造、人口統計、コスト分析を含む組織データからの戦略的インサイト",
    "/advanced-settings": "システムの高度な設定を構成",
    "/organization": "CSV/XLSXファイルから組織構造と社員データをインポート",
    "/manager/bi": "ビジネスインテリジェンスツールと洞察にアクセス",
    "/manager/hr-evaluation": "従業員のパフォーマンス評価を管理",
    "/hr-evaluation": "従業員のパフォーマンス評価を管理",
    "/manager/evaluation-reports": "部門別・個人別の評価分析レポート",
    "/evaluation-reports": "部門別・個人別の評価分析レポート",
    "/manager/organization-chart": "会社の組織構造と社員情報を閲覧",
    "/manager/custom-evaluation":
      "例外的なケースのためのカスタム評価者と被評価者の関係を管理します",
    "/custom-evaluation": "部門の評価関係を確認・承認します",
    "/backoffice/business-trip": "出張申請の提出と管理",
    "/backoffice/expense-claim": "経費精算の提出と追跡",
    "/admin": "システム環境と設定を管理します",
    "/admin/users": "ユーザアカウントと権限を管理",
    "/admin/access-keys": "機能拡張のためのアクセスキーを管理",
    "/data-import": "CSV/XLSXファイルから社員データと組織データをインポート",
    "/data-history": "データ変更履歴とスナップショットの表示・管理",
    "/evaluation-master":
      "評価期間、重み設定、成長カテゴリー、評価関係を管理します",
    "/user/my-evaluation": "あなたの人事評価を確認・管理します",
    "/organization-chart": "会社の組織構造と社員情報を閲覧",
    "/user/calendar": "個人カレンダーと会社イベントの確認・管理を行います",
    "/user/ai-chat":
      "llama.cppを使用したローカルLLMとのチャットインターフェースです。会話はローカルマシンで処理され、外部サーバにデータを送信しません。",
    "/backoffice/resource-management":
      "会議室、設備、車両などのリソースを管理します",
    "/backoffice/resource-management/meeting-rooms":
      "会議室の予約と管理を行います",
    "/backoffice/resource-management/meeting-rooms/[id]":
      "会議室の詳細情報と空き状況カレンダーを確認します",
    "/backoffice/resource-management/equipment":
      "プロジェクター、ノートPC等の設備を管理します",
    "/backoffice/resource-management/vehicles": "社用車の予約と管理を行います",
    "/backoffice/company-events":
      "全社イベント、お知らせ、休日カレンダーの管理を行います",
    "/backoffice/page-announcements":
      "ページ固有のお知らせ、ヒント、FAQ、ガイドを管理します",
    "/backoffice/ticket-sales": "社内チケット販売、顧客、商品を管理します",
    "/backoffice/ai-business-analysis":
      "AIとの対話を通じて業務プロセスを分析し、業務分掌・業務フロー図を作成します",
    "/admin/openldap":
      "OpenLDAPユーザの管理、既存LDAPサーバからの移行、OpenLDAP設定を行います",
  },
} as const;

export function getPageTitle(pathname: string, language: "en" | "ja"): string {
  const titles = pageTitles[language];

  // 直接マッチを試す
  const directMatch = titles[pathname as keyof typeof titles];
  if (directMatch) return directMatch;

  // 動的ルートのマッチング
  // /manager/hr-evaluation/[id] -> "人事評価"
  if (
    pathname.startsWith("/manager/hr-evaluation/") ||
    pathname.startsWith("/hr-evaluation/")
  ) {
    return language === "ja" ? "人事評価" : "HR Evaluation";
  }

  // /manager/custom-evaluation/change-evaluator/[employeeId] -> "評価者変更"
  if (pathname.startsWith("/manager/custom-evaluation/change-evaluator/")) {
    return language === "ja" ? "評価者変更" : "Change Evaluator";
  }

  // /manager/custom-evaluation/add-relation -> "カスタム評価関係追加"
  if (pathname.startsWith("/manager/custom-evaluation/add-relation")) {
    return language === "ja" ? "カスタム評価関係追加" : "Add Custom Relation";
  }

  // /manager/custom-evaluation/[id] -> "評価関係一覧"
  if (
    pathname.startsWith("/manager/custom-evaluation/") ||
    pathname.startsWith("/custom-evaluation/")
  ) {
    return language === "ja" ? "評価関係一覧" : "Evaluation Relations";
  }

  // /user/my-evaluation/[periodId]/detail -> "評価詳細"
  if (
    pathname.startsWith("/user/my-evaluation/") &&
    pathname.includes("/detail")
  ) {
    return language === "ja" ? "評価詳細" : "Evaluation Details";
  }

  // /user/my-evaluation -> "わたしの評価"
  if (pathname.startsWith("/user/my-evaluation")) {
    return language === "ja" ? "わたしの評価" : "My Evaluation";
  }

  // /backoffice/resource-management/* -> "リソース管理"
  if (pathname.startsWith("/backoffice/resource-management")) {
    return language === "ja" ? "リソース管理" : "Resource Management";
  }

  // /user/calendar/* -> "わたしのカレンダー"
  if (pathname.startsWith("/user/calendar")) {
    return language === "ja" ? "わたしのカレンダー" : "My Calendar";
  }

  return "BoxFrame";
}

export function getPageDescription(
  pathname: string,
  language: "en" | "ja",
): string | null {
  const descriptions = pageDescriptions[language];

  // 直接マッチを試す
  const directMatch = descriptions[pathname as keyof typeof descriptions];
  if (directMatch) return directMatch;

  // 動的ルートのマッチング
  // /backoffice/resource-management/meeting-rooms/[id]
  if (pathname.startsWith("/backoffice/resource-management/meeting-rooms/")) {
    return language === "ja"
      ? "会議室の詳細情報と空き状況カレンダーを確認します"
      : "View meeting room details and availability calendar";
  }

  return null;
}
