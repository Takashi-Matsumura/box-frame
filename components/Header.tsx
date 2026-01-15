"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { appConfig } from "@/lib/config/app";
import { getTabsByMenuPath } from "@/lib/modules/registry";

/** タブアイテムの型定義 */
interface TabItem {
  name: string;
  icon: ReactNode;
  path: string;
  active: boolean;
}

import { Info, Menu } from "lucide-react";
import {
  FaChartBar,
  FaDatabase,
  FaExclamationTriangle,
  FaTrash,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { NotificationBell } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { getPageTitle } from "@/lib/i18n/page-titles";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

interface HeaderProps {
  session?: {
    user: {
      role: string;
    };
  } | null;
  language?: string;
  accessKeyTabPermissions?: Record<string, string[]>;
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

export function Header({
  session,
  language = "en",
  accessKeyTabPermissions = {},
}: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { width, open } = useSidebarStore();
  const isTabletOrMobile = useIsTabletOrMobile();
  const pageTitle = getPageTitle(pathname, language as "en" | "ja");

  // ユーザーがADMINロールか判定
  const isAdminRole = session?.user?.role === "ADMIN";

  // タブをフィルタリングするヘルパー関数
  // ADMINロールはすべてのタブにアクセス可能
  // それ以外はアクセスキーで許可されたタブのみ
  const filterTabsByPermission = (
    tabs: TabItem[],
    menuPath: string,
  ): TabItem[] => {
    if (isAdminRole) {
      return tabs;
    }
    const allowedTabIds = accessKeyTabPermissions[menuPath];
    if (!allowedTabIds || allowedTabIds.length === 0) {
      // タブレベルの権限がない場合、メニューレベルの権限で全タブ許可
      return tabs;
    }
    return tabs.filter((tab) => {
      const tabId = new URL(tab.path, "http://localhost").searchParams.get(
        "tab",
      );
      return tabId && allowedTabIds.includes(tabId);
    });
  };

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

  // 管理画面タブ（レジストリから取得）
  const adminTab = searchParams.get("tab") || "users";
  const registryAdminTabs = getTabsByMenuPath("/admin");
  const adminTabs =
    registryAdminTabs?.map((tab) => ({
      name: language === "ja" ? tab.nameJa : tab.name,
      icon: tab.icon,
      path: `/admin?tab=${tab.id}`,
      active: adminTab === tab.id,
    })) || [];

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

  // 組織データ管理タブ（レジストリから取得）
  const dataManagementTab = searchParams.get("tab") || "import";
  const registryDataManagementTabs = getTabsByMenuPath(
    "/admin/data-management",
  );
  const dataManagementTabs =
    registryDataManagementTabs?.map((tab) => ({
      name: language === "ja" ? tab.nameJa : tab.name,
      icon: tab.icon,
      path: `/admin/data-management?tab=${tab.id}`,
      active: dataManagementTab === tab.id,
    })) || [];

  // 評価マスタタブ（レジストリから取得）
  const evaluationMasterTab = searchParams.get("tab") || "periods";
  const registryEvaluationMasterTabs = getTabsByMenuPath(
    "/admin/evaluation-master",
  );
  const evaluationMasterTabs =
    registryEvaluationMasterTabs?.map((tab) => ({
      name: language === "ja" ? tab.nameJa : tab.name,
      icon: tab.icon,
      path: `/admin/evaluation-master?tab=${tab.id}`,
      active: evaluationMasterTab === tab.id,
    })) || [];

  // 評価AIサポートタブ（レジストリから取得）
  const evaluationRagTab = searchParams.get("tab") || "knowledge-base";
  const registryEvaluationRagTabs = getTabsByMenuPath("/admin/evaluation-rag");
  const evaluationRagTabs =
    registryEvaluationRagTabs?.map((tab) => ({
      name: language === "ja" ? tab.nameJa : tab.name,
      icon: tab.icon,
      path: `/admin/evaluation-rag?tab=${tab.id}`,
      active: evaluationRagTab === tab.id,
    })) || [];

  const renderTabs = (tabs: TabItem[], label: string) => (
    <div className="border-t border-border bg-muted">
      <nav className="flex gap-1 px-6" aria-label={label}>
        {tabs.map((tab) => (
          <TooltipProvider key={tab.path}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={tab.path}
                  className={`
                    flex items-center gap-2 px-3 lg:px-6 py-3 text-sm font-medium
                    border-b-2 transition-colors whitespace-nowrap
                    ${
                      tab.active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  {tab.icon}
                  <span className="hidden lg:inline">{tab.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="lg:hidden">
                <p>{tab.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </nav>
    </div>
  );

  return (
    <header
      className="bg-card shadow-lg border-b border-border fixed top-0 right-0 z-[8] transition-all duration-300"
      style={{
        left: session
          ? isTabletOrMobile
            ? "0"
            : open
              ? `${width}px`
              : "4rem"
          : "0",
      }}
    >
      {/* システムアナウンスバナー */}
      <AnnouncementBanner language={language as "en" | "ja"} />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session && isTabletOrMobile && <SidebarToggleButton />}
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
      {isDataManagement &&
        renderTabs(
          filterTabsByPermission(dataManagementTabs, "/admin/data-management"),
          "Data Management Tabs",
        )}
      {isEvaluationMaster &&
        renderTabs(
          filterTabsByPermission(
            evaluationMasterTabs,
            "/admin/evaluation-master",
          ),
          "Evaluation Master Tabs",
        )}
      {isEvaluationRag &&
        renderTabs(
          filterTabsByPermission(evaluationRagTabs, "/admin/evaluation-rag"),
          "Evaluation AI Support Tabs",
        )}
    </header>
  );
}
