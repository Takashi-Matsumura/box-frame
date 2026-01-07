"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { appConfig } from "@/lib/config/app";
import {
  FaBullhorn,
  FaChartBar,
  FaClipboardList,
  FaDatabase,
  FaExclamationTriangle,
  FaHistory,
  FaInfoCircle,
  FaSitemap,
  FaStar,
  FaTrash,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import { Info, Menu } from "lucide-react";
import { getPageTitle } from "@/lib/i18n/page-titles";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

interface HeaderProps {
  session?: {
    user: {
      role: string;
    };
  } | null;
  language?: string;
}

function SidebarToggleButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleSidebar}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function Header({ session, language = "en" }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { width, open } = useSidebarStore();
  const isTabletOrMobile = useIsTabletOrMobile();
  const pageTitle = getPageTitle(pathname, language as "en" | "ja");

  // ページ判定
  const isAnalytics =
    pathname === "/manager/analytics" || pathname === "/analytics";
  const isAdmin = pathname === "/admin";
  const isDataImport = pathname === "/data-import";
  const isSettings = pathname === "/settings";
  const isDataManagement = pathname === "/admin/data-management";
  const isEvaluationMaster = pathname === "/admin/evaluation-master";
  const isEvaluationRag = pathname === "/admin/evaluation-rag";

  // 組織分析タブ
  const analyticsTab = searchParams.get("tab") || "overview";
  const analyticsBasePath =
    pathname === "/analytics" ? "/analytics" : "/manager/analytics";
  const analyticsTabs = [
    {
      name: language === "ja" ? "概要" : "Overview",
      icon: <FaChartBar className="w-5 h-5" />,
      path: `${analyticsBasePath}?tab=overview`,
      active: analyticsTab === "overview",
    },
    {
      name: language === "ja" ? "組織健全性" : "Organizational Health",
      icon: <FaExclamationTriangle className="w-5 h-5" />,
      path: `${analyticsBasePath}?tab=health`,
      active: analyticsTab === "health",
    },
    {
      name: language === "ja" ? "詳細分析" : "Detailed Analysis",
      icon: <FaUsers className="w-5 h-5" />,
      path: `${analyticsBasePath}?tab=detailed`,
      active: analyticsTab === "detailed",
    },
    {
      name: language === "ja" ? "トレンド" : "Trends",
      icon: <FaChartBar className="w-5 h-5" />,
      path: `${analyticsBasePath}?tab=trends`,
      active: analyticsTab === "trends",
    },
  ];

  // 管理画面タブ
  const adminTab = searchParams.get("tab") || "users";
  const adminTabs = [
    {
      name: language === "ja" ? "システム情報" : "System Information",
      icon: <FaInfoCircle className="w-5 h-5" />,
      path: "/admin?tab=system",
      active: adminTab === "system",
    },
    {
      name: language === "ja" ? "ユーザ管理" : "User Management",
      icon: <FaUsers className="w-5 h-5" />,
      path: "/admin?tab=users",
      active: adminTab === "users",
    },
    {
      name: language === "ja" ? "アクセスキー" : "Access Keys",
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
      path: "/admin?tab=access-keys",
      active: adminTab === "access-keys",
    },
    {
      name: language === "ja" ? "モジュール管理" : "Module Management",
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
      path: "/admin?tab=modules",
      active: adminTab === "modules",
    },
    {
      name: language === "ja" ? "監査ログ" : "Audit Logs",
      icon: <FaClipboardList className="w-5 h-5" />,
      path: "/admin?tab=audit-logs",
      active: adminTab === "audit-logs",
    },
    {
      name: language === "ja" ? "アナウンス" : "Announcements",
      icon: <FaBullhorn className="w-5 h-5" />,
      path: "/admin?tab=announcements",
      active: adminTab === "announcements",
    },
  ];

  // データインポートタブ
  const dataImportTab = searchParams.get("tab") || "upload";
  const dataImportTabs = [
    {
      name: language === "ja" ? "ファイルアップロード" : "File Upload",
      icon: <FaUpload className="w-5 h-5" />,
      path: "/data-import?tab=upload",
      active: dataImportTab === "upload",
    },
    {
      name: language === "ja" ? "スナップショット" : "Snapshot",
      icon: <FaDatabase className="w-5 h-5" />,
      path: "/data-import?tab=snapshot",
      active: dataImportTab === "snapshot",
    },
    {
      name: language === "ja" ? "データ削除" : "Data Deletion",
      icon: <FaTrash className="w-5 h-5" />,
      path: "/data-import?tab=delete",
      active: dataImportTab === "delete",
    },
  ];

  // 設定タブ
  const settingsTab = searchParams.get("tab") || "basic";
  const settingsTabs = [
    {
      name: language === "ja" ? "基本" : "Basic",
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      path: "/settings?tab=basic",
      active: settingsTab === "basic",
    },
    {
      name: language === "ja" ? "キー" : "Keys",
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
      path: "/settings?tab=keys",
      active: settingsTab === "keys",
    },
  ];

  // 組織データ管理タブ
  const dataManagementTab = searchParams.get("tab") || "import";
  const dataManagementTabs = [
    {
      name: language === "ja" ? "インポート" : "Import",
      icon: <FaUpload className="w-5 h-5" />,
      path: "/admin/data-management?tab=import",
      active: dataManagementTab === "import",
    },
    {
      name: language === "ja" ? "社員一覧" : "Employees",
      icon: <FaUsers className="w-5 h-5" />,
      path: "/admin/data-management?tab=employees",
      active: dataManagementTab === "employees",
    },
    {
      name: language === "ja" ? "組織整備" : "Organize",
      icon: <FaSitemap className="w-5 h-5" />,
      path: "/admin/data-management?tab=organize",
      active: dataManagementTab === "organize",
    },
    {
      name: language === "ja" ? "履歴" : "History",
      icon: <FaHistory className="w-5 h-5" />,
      path: "/admin/data-management?tab=history",
      active: dataManagementTab === "history",
    },
  ];

  // 人事評価マスタタブ
  const evaluationMasterTab = searchParams.get("tab") || "periods";
  const evaluationMasterTabs = [
    {
      name: language === "ja" ? "評価期間" : "Periods",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-master?tab=periods",
      active: evaluationMasterTab === "periods",
    },
    {
      name: language === "ja" ? "評価重み" : "Weights",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-master?tab=weights",
      active: evaluationMasterTab === "weights",
    },
    {
      name: language === "ja" ? "結果評価" : "Results Evaluation",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-master?tab=organizationGoals",
      active: evaluationMasterTab === "organizationGoals",
    },
    {
      name: language === "ja" ? "プロセス評価" : "Process Categories",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-master?tab=processCategories",
      active: evaluationMasterTab === "processCategories",
    },
    {
      name: language === "ja" ? "成長評価" : "Growth Categories",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-master?tab=growthCategories",
      active: evaluationMasterTab === "growthCategories",
    },
  ];

  // 評価AIサポートタブ
  const evaluationRagTab = searchParams.get("tab") || "knowledge-base";
  const evaluationRagTabs = [
    {
      name: language === "ja" ? "ナレッジベース" : "Knowledge Base",
      icon: <FaDatabase className="w-5 h-5" />,
      path: "/admin/evaluation-rag?tab=knowledge-base",
      active: evaluationRagTab === "knowledge-base",
    },
    {
      name: language === "ja" ? "システムプロンプト" : "System Prompt",
      icon: <FaStar className="w-5 h-5" />,
      path: "/admin/evaluation-rag?tab=system-prompt",
      active: evaluationRagTab === "system-prompt",
    },
  ];

  const renderTabs = (tabs: typeof analyticsTabs, label: string) => (
    <div className="border-t border-border bg-muted">
      <nav className="flex gap-1 px-6" aria-label={label}>
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                tab.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            {tab.icon}
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <header
      className="bg-card shadow-lg border-b border-border fixed top-0 right-0 z-[8] transition-all duration-300"
      style={{
        left: session ? (isTabletOrMobile ? "0" : open ? `${width}px` : "4rem") : "0",
      }}
    >
      {/* システムアナウンスバナー */}
      <AnnouncementBanner language={language as "en" | "ja"} />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session && isTabletOrMobile && (
              <SidebarToggleButton />
            )}
            {session ? (
              <h1 className="text-xl font-bold">{pageTitle}</h1>
            ) : (
              <Link href="/" className="text-xl font-bold">
                {appConfig.name}
              </Link>
            )}
          </div>
          {session && (
            <div className="flex items-center gap-2">
              <NotificationBell language={language as "en" | "ja"} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{language === "ja" ? "ページ情報" : "Page Info"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {isAnalytics && renderTabs(analyticsTabs, "Analytics Tabs")}
      {isAdmin && renderTabs(adminTabs, "Admin Tabs")}
      {isDataImport && renderTabs(dataImportTabs, "Data Import Tabs")}
      {isSettings && renderTabs(settingsTabs, "Settings Tabs")}
      {isDataManagement && renderTabs(dataManagementTabs, "Data Management Tabs")}
      {isEvaluationMaster && renderTabs(evaluationMasterTabs, "Evaluation Master Tabs")}
      {isEvaluationRag && renderTabs(evaluationRagTabs, "Evaluation AI Support Tabs")}
    </header>
  );
}
