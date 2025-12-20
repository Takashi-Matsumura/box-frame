"use client";

import type { AccessKey, Role } from "@prisma/client";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccessKeyManager } from "@/components/AccessKeyManager";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { UserRoleChanger } from "@/components/UserRoleChanger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { getModuleIcon } from "@/lib/modules/icons";
import type { AppMenu } from "@/types/module";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: string;
  lastSignInAt: string | null;
}

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

type AccessKeyWithTargetUser = AccessKey & {
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  _count: {
    userAccessKeys: number;
  };
};

interface AdminClientProps {
  language: "en" | "ja";
  currentUserId: string;
  initialStats: {
    totalUsers: number;
    adminCount: number;
    userCount: number;
  };
  accessKeys: AccessKeyWithTargetUser[];
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  }>;
  menus: AppMenu[];
}

type TabType = "system" | "users" | "access-keys" | "modules";

interface ModuleInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  enabled: boolean;
  type: "core" | "addon";
  menuCount: number;
  menus: Array<{
    id: string;
    name: string;
    nameJa: string;
    path: string;
    menuGroup: string;
    enabled: boolean;
    order: number;
    requiredRoles: string[];
  }>;
}

interface ModulesData {
  modules: ModuleInfo[];
  statistics: {
    total: number;
    core: number;
    addons: number;
    enabled: number;
    disabled: number;
  };
}

interface OpenLdapStatus {
  isAvailable: boolean;
  config: {
    url: string;
    baseDn: string;
    usersOu: string;
  };
  timestamp: string;
  message: string;
  messageJa: string;
}

export function AdminClient({
  language,
  currentUserId,
  initialStats,
  accessKeys,
  users,
  menus,
}: AdminClientProps) {
  const searchParams = useSearchParams();
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  const activeTab = (searchParams.get("tab") as TabType) || "users";

  // ユーザ管理タブの状態
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 1ページあたりのアイテム数
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // モジュール管理タブの状態
  const [modulesData, setModulesData] = useState<ModulesData | null>(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);

  // OpenLDAPステータス
  const [openLdapStatus, setOpenLdapStatus] = useState<OpenLdapStatus | null>(
    null,
  );
  const [openLdapStatusLoading, setOpenLdapStatusLoading] = useState(false);

  // Google OAuth設定
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [googleOAuthLoading, setGoogleOAuthLoading] = useState(false);

  // OpenLDAPテスト認証
  const [testAuthUsername, setTestAuthUsername] = useState("");
  const [testAuthPassword, setTestAuthPassword] = useState("");
  const [testAuthLoading, setTestAuthLoading] = useState(false);
  const [testAuthResult, setTestAuthResult] = useState<{
    success: boolean;
    message?: string;
    messageJa?: string;
    error?: string;
    errorJa?: string;
    user?: {
      username: string;
      displayName?: string;
      email?: string;
      userDN?: string;
    };
  } | null>(null);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // OpenLDAPステータスを取得
  const fetchOpenLdapStatus = useCallback(async () => {
    try {
      setOpenLdapStatusLoading(true);
      const response = await fetch("/api/admin/openldap/status");
      if (response.ok) {
        const data: OpenLdapStatus = await response.json();
        setOpenLdapStatus(data);
      }
    } catch (error) {
      console.error("Error fetching OpenLDAP status:", error);
    } finally {
      setOpenLdapStatusLoading(false);
    }
  }, []);

  // OpenLDAPモジュールが選択された時にステータスを取得
  useEffect(() => {
    if (selectedModule?.id === "openldap") {
      fetchOpenLdapStatus();
    }
  }, [selectedModule, fetchOpenLdapStatus]);

  // Google OAuth設定を取得
  const fetchGoogleOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/google-oauth");
      if (response.ok) {
        const data = await response.json();
        setGoogleOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching Google OAuth setting:", error);
    }
  }, []);

  // Google OAuth設定を切り替え
  const handleGoogleOAuthToggle = useCallback(async (enabled: boolean) => {
    setGoogleOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/google-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGoogleOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating Google OAuth setting:", error);
    } finally {
      setGoogleOAuthLoading(false);
    }
  }, []);

  // システムタブが表示された時にGoogle OAuth設定を取得
  useEffect(() => {
    if (activeTab === "system") {
      fetchGoogleOAuthSetting();
    }
  }, [activeTab, fetchGoogleOAuthSetting]);

  // OpenLDAPテスト認証を実行
  const handleTestAuth = useCallback(async () => {
    if (!testAuthUsername || !testAuthPassword) {
      return;
    }

    try {
      setTestAuthLoading(true);
      setTestAuthResult(null);
      const response = await fetch("/api/admin/openldap/test-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: testAuthUsername,
          password: testAuthPassword,
        }),
      });
      const data = await response.json();
      setTestAuthResult(data);
    } catch (error) {
      console.error("Error testing OpenLDAP auth:", error);
      setTestAuthResult({
        success: false,
        error: "Failed to test authentication",
        errorJa: "認証テストに失敗しました",
      });
    } finally {
      setTestAuthLoading(false);
    }
  }, [testAuthUsername, testAuthPassword]);

  // メニュー順序を更新
  const handleUpdateMenuOrder = useCallback(async (menuId: string, order: number) => {
    try {
      const response = await fetch("/api/admin/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, order }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update menu order");
      }

      // ローカルの状態を更新
      setModulesData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            menus: m.menus.map((menu) =>
              menu.id === menuId ? { ...menu, order } : menu
            ),
          })),
        };
      });

      // 選択中のモジュールも更新
      setSelectedModule((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === menuId ? { ...menu, order } : menu
          ),
        };
      });
    } catch (error) {
      console.error("Error updating menu order:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to update menu order",
          error instanceof Error ? error.message : "メニュー順序の更新に失敗しました"
        )
      );
    }
  }, [t]);

  // モジュールの有効/無効を切り替え
  const handleToggleModule = useCallback(async (moduleId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update module");
      }

      // ローカルの状態を更新
      setModulesData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === moduleId ? { ...m, enabled } : m
          ),
          statistics: {
            ...prev.statistics,
            enabled: enabled
              ? prev.statistics.enabled + 1
              : prev.statistics.enabled - 1,
            disabled: enabled
              ? prev.statistics.disabled - 1
              : prev.statistics.disabled + 1,
          },
        };
      });
    } catch (error) {
      console.error("Error toggling module:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to update module",
          error instanceof Error ? error.message : "モジュールの更新に失敗しました"
        )
      );
    }
  }, [t]);

  // モジュールデータを取得
  const fetchModules = useCallback(async () => {
    if (activeTab !== "modules") return;

    try {
      setModulesLoading(true);
      const response = await fetch("/api/admin/modules");
      if (!response.ok) {
        throw new Error("Failed to fetch modules");
      }
      const data: ModulesData = await response.json();
      setModulesData(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setModulesLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // ユーザデータを取得
  const fetchUsers = useCallback(async () => {
    if (activeTab !== "users") return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== "ALL" && { role: roleFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data: PaginatedUsers = await response.json();
      setPaginatedUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, searchQuery, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ページ変更ハンドラ
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 検索ハンドラ
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1); // 検索時は1ページ目に戻る
    fetchUsers();
  };

  // ソートハンドラ
  const handleSort = (column: "name" | "email" | "role" | "createdAt") => {
    if (sortBy === column) {
      // 同じカラムをクリックした場合は昇順/降順を切り替え
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 別のカラムをクリックした場合は降順から開始
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // ページサイズ変更ハンドラ
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // 削除確認モーダルを開く
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // 削除確認モーダルを閉じる
  const closeDeleteModal = () => {
    setUserToDelete(null);
    setShowDeleteModal(false);
  };

  // ユーザ削除処理
  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // 削除成功
      closeDeleteModal();
      // ユーザリストを再取得
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to delete user",
          error instanceof Error
            ? error.message
            : "ユーザの削除に失敗しました",
        ),
      );
    } finally {
      setDeleting(false);
    }
  }, [
    userToDelete,
    fetchUsers,
    t, // 削除成功
    closeDeleteModal,
  ]);

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{ top: "9rem", left: open ? `${width}px` : "4rem" }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* システム情報タブ */}
          {activeTab === "system" && (
            <Card>
              <CardContent className="p-8">
              {/* 統計カード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("Total Users", "総ユーザ数")}
                    </h3>
                    <p className="text-3xl font-bold">
                      {initialStats.totalUsers}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("Regular Users", "一般ユーザ")}
                    </h3>
                    <p className="text-3xl font-bold">
                      {initialStats.userCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("Administrators", "管理者")}
                    </h3>
                    <p className="text-3xl font-bold">
                      {initialStats.adminCount}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* システム情報 */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">
                  {t("System Information", "システム情報")}
                </h2>

                <div className="p-6 bg-muted rounded-lg">
                  <div className="space-y-3 text-muted-foreground">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">{t("Framework", "フレームワーク")}</span>
                      <span>Next.js 15 (App Router)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">{t("Database", "データベース")}</span>
                      <span>PostgreSQL (Prisma ORM)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">{t("Authentication", "認証")}</span>
                      <span>Auth.js (NextAuth.js v5)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">{t("Auth Providers", "認証プロバイダー")}</span>
                      <span>Google OAuth / OpenLDAP</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">{t("Styling", "スタイリング")}</span>
                      <span>Tailwind CSS 4</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">{t("Language", "言語")}</span>
                      <span>TypeScript</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 認証設定 */}
              <div className="space-y-4 mt-8">
                <h2 className="text-2xl font-semibold">
                  {t("Authentication Settings", "認証設定")}
                </h2>

                <div className="p-6 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Google OAuth
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(
                          "Enable Google OAuth login on the login page",
                          "ログイン画面でGoogle OAuthログインを有効にする"
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={googleOAuthEnabled}
                      onCheckedChange={handleGoogleOAuthToggle}
                      disabled={googleOAuthLoading}
                    />
                  </div>
                  {!googleOAuthEnabled && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                      {t(
                        "To enable Google OAuth, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.",
                        "Google OAuthを有効にするには、環境変数にGOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。"
                      )}
                    </p>
                  )}
                </div>
              </div>
              </CardContent>
            </Card>
          )}

          {/* ユーザ管理タブ */}
          {activeTab === "users" && (
            <Card>
              <CardContent className="p-6">
              {/* ツールバー：検索・フィルター */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t(
                        "Search by name or email...",
                        "名前またはメールで検索...",
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-72"
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    {t("Search", "検索")}
                  </Button>
                </form>
                <div className="flex items-center gap-2">
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => {
                      setRoleFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t("All Roles", "すべてのロール")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("All Roles", "すべてのロール")}</SelectItem>
                      <SelectItem value="ADMIN">{t("Admin", "管理者")}</SelectItem>
                      <SelectItem value="MANAGER">{t("Manager", "マネージャー")}</SelectItem>
                      <SelectItem value="USER">{t("User", "ユーザ")}</SelectItem>
                      <SelectItem value="GUEST">{t("Guest", "ゲスト")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ローディング */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-muted-foreground">
                    {t("Loading...", "読み込み中...")}
                  </p>
                </div>
              )}

              {/* ユーザテーブル */}
              {!loading && paginatedUsers.length > 0 && (
                <>
                  {/* ページネーション（テーブル上部） */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {t("Total", "合計")}: <span className="font-medium text-foreground">{total}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t("Previous", "前へ")}
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">{page}</span>
                        <span className="text-sm text-muted-foreground">/</span>
                        <span className="text-sm text-muted-foreground">{totalPages || 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="gap-1"
                      >
                        {t("Next", "次へ")}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* テーブルコンテナ */}
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-y-auto max-h-[calc(100vh-32rem)]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 z-10">
                          <TableRow>
                            <TableHead className="w-[250px]">
                              <button
                                onClick={() => handleSort("name")}
                                className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                              >
                                {t("User", "ユーザ")}
                                {sortBy === "name" && (
                                  <span className="text-primary">
                                    {sortOrder === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="w-[150px]">
                              <button
                                onClick={() => handleSort("role")}
                                className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                              >
                                {t("Role", "ロール")}
                                {sortBy === "role" && (
                                  <span className="text-primary">
                                    {sortOrder === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="w-[180px]">
                              <button
                                onClick={() => handleSort("createdAt")}
                                className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                              >
                                {t("Login / Created", "ログイン / 作成日")}
                                {sortBy === "createdAt" && (
                                  <span className="text-primary">
                                    {sortOrder === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="w-[80px] text-right">
                              {t("Actions", "操作")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {user.image ? (
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                      <Image
                                        src={user.image}
                                        alt={user.name || "User"}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                      <span className="text-muted-foreground text-sm font-semibold">
                                        {user.name?.[0]?.toUpperCase() || "?"}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {user.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {user.email}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <UserRoleChanger
                                  userId={user.id}
                                  currentRole={user.role}
                                  isCurrentUser={user.id === currentUserId}
                                  language={language}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.lastSignInAt
                                      ? new Date(
                                          user.lastSignInAt,
                                        ).toLocaleDateString(
                                          language === "ja" ? "ja-JP" : "en-US",
                                          {
                                            year: "numeric",
                                            month:
                                              language === "ja"
                                                ? "long"
                                                : "short",
                                            day: "numeric",
                                          },
                                        )
                                      : t("Never", "未ログイン")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {t("Created", "作成")}:{" "}
                                    {new Date(
                                      user.createdAt,
                                    ).toLocaleDateString(
                                      language === "ja" ? "ja-JP" : "en-US",
                                      {
                                        year: "numeric",
                                        month:
                                          language === "ja" ? "long" : "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {user.id !== currentUserId ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => openDeleteModal(user)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t("Delete", "削除")}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {t("(You)", "(自分)")}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {/* データなし */}
              {!loading && paginatedUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t("No users found", "ユーザが見つかりません")}
                  </p>
                </div>
              )}
              </CardContent>
            </Card>
          )}

          {/* アクセスキー管理タブ */}
          {activeTab === "access-keys" && (
            <Card>
              <CardContent className="p-8">
                <AccessKeyManager
                  accessKeys={accessKeys}
                  users={users}
                  menus={menus}
                  adminId={currentUserId}
                  language={language}
                />
              </CardContent>
            </Card>
          )}

          {/* モジュール管理タブ */}
          {activeTab === "modules" && (
            <Card className="h-full flex flex-col">
              {/* モジュール一覧画面 */}
              {!selectedModule && (
                <>
                  {/* 固定ヘッダー：統計 */}
                  <div className="p-6 border-b flex-shrink-0">
                    {modulesData && (() => {
                      const addons = modulesData.modules.filter(m => m.type === "addon");
                      const addonsEnabled = addons.filter(m => m.enabled).length;
                      const addonsDisabled = addons.filter(m => !m.enabled).length;
                      return (
                        <div className="grid grid-cols-2 gap-4 max-w-md">
                          <div className="bg-muted rounded-lg p-4">
                            <div className="text-sm text-muted-foreground font-medium">
                              {t("Core", "コア")}
                            </div>
                            <div className="text-2xl font-bold">
                              {modulesData.statistics.core}
                            </div>
                          </div>
                          <div className="bg-muted rounded-lg p-4">
                            <div className="text-sm text-muted-foreground font-medium">
                              {t("Addons", "アドオン")}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">
                                {modulesData.statistics.addons}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({t("Enabled", "有効")}: {addonsEnabled} / {t("Disabled", "無効")}: {addonsDisabled})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ローディング */}
                  {modulesLoading && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                        <p className="mt-4 text-muted-foreground">
                          {t("Loading...", "読み込み中...")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* モジュール一覧 */}
                  {!modulesLoading && modulesData && (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {modulesData.modules.map((module) => (
                          <Card
                            key={module.id}
                            className={`hover:shadow-md transition-all ${
                              !module.enabled && "opacity-70 hover:opacity-100"
                            }`}
                          >
                            <CardHeader className="pb-3">
                              {/* トグルスイッチ */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={module.enabled}
                                    onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
                                    disabled={module.type === "core"}
                                  />
                                  <span className={`text-sm font-medium ${module.enabled ? "text-green-700" : "text-muted-foreground"}`}>
                                    {module.enabled ? t("Enabled", "有効") : t("Disabled", "無効")}
                                  </span>
                                </div>
                                <Badge variant="outline" className={
                                  module.type === "core"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                }>
                                  {module.type === "core" ? "Core" : "Addon"}
                                </Badge>
                              </div>

                              {/* モジュールヘッダー */}
                              <div
                                className="cursor-pointer"
                                onClick={() => setSelectedModule(module)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                    {getModuleIcon(module.id, "w-5 h-5")}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">
                                      {module.nameJa}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {module.name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent
                              className="cursor-pointer"
                              onClick={() => setSelectedModule(module)}
                            >
                              {/* モジュール説明 */}
                              {module.descriptionJa && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {module.descriptionJa}
                                </p>
                              )}

                              {/* モジュール情報 */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {t("Menus", "メニュー数")}:
                                  </span>
                                  <span className="font-medium">
                                    {module.menuCount}
                                  </span>
                                </div>
                              </div>

                              {/* モジュールID */}
                              <div className="mt-4 pt-4 border-t">
                                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {module.id}
                                </code>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* モジュール詳細画面 */}
              {selectedModule && (
                <div className="h-full flex flex-col">
                  {/* ヘッダー */}
                  <div className="p-6 border-b flex-shrink-0 flex items-center gap-4">
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                      {getModuleIcon(selectedModule.id, "w-7 h-7")}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">
                        {selectedModule.nameJa}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedModule.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {/* モジュール情報 */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Type", "タイプ")}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedModule.type === "core"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {selectedModule.type === "core"
                            ? "Core Module"
                            : "Addon Module"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Status", "ステータス")}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedModule.enabled
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {selectedModule.enabled
                            ? t("Enabled", "有効")
                            : t("Disabled", "無効")}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Description", "説明")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedModule.descriptionJa || t("None", "なし")}
                        </p>
                      </div>
                    </div>

                    {/* モジュールID */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        {t("Module ID", "モジュールID")}
                      </h3>
                      <code className="text-sm bg-muted px-3 py-2 rounded block">
                        {selectedModule.id}
                      </code>
                    </div>

                    {/* OpenLDAPサーバ情報（openldapモジュールのみ） */}
                    {selectedModule.id === "openldap" && (
                      <div className="mb-6 p-4 bg-muted border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
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
                                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {t(
                                  "OpenLDAP Server Information",
                                  "OpenLDAP サーバ情報",
                                )}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "OpenLDAP container connection status and settings",
                                  "OpenLDAPコンテナの接続状態と設定情報",
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={fetchOpenLdapStatus}
                            disabled={openLdapStatusLoading}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
                          >
                            {openLdapStatusLoading
                              ? t("Loading...", "読み込み中...")
                              : t("Refresh Status", "状態を更新")}
                          </button>
                        </div>

                        {openLdapStatusLoading && !openLdapStatus ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                          </div>
                        ) : openLdapStatus ? (
                          <div className="space-y-3">
                            {/* 接続状態 */}
                            <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                              <div>
                                <p className="text-sm font-medium">
                                  {t("Connection Status", "接続状態")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {openLdapStatus.isAvailable
                                    ? t(
                                        "Connected to OpenLDAP server",
                                        "OpenLDAPサーバに接続できます",
                                      )
                                    : t(
                                        "Cannot connect to OpenLDAP server",
                                        "OpenLDAPサーバに接続できません",
                                      )}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                                  openLdapStatus.isAvailable
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${openLdapStatus.isAvailable ? "bg-green-500" : "bg-red-500"}`}
                                />
                                {openLdapStatus.isAvailable
                                  ? "Available"
                                  : "Unavailable"}
                              </span>
                            </div>

                            {/* 接続URL */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Connection URL", "接続URL")}
                              </p>
                              <code className="text-sm text-primary bg-muted px-2 py-1 rounded">
                                {openLdapStatus.config.url ||
                                  t("Not configured", "未設定")}
                              </code>
                            </div>

                            {/* ベースDN */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Base DN", "ベースDN")}
                              </p>
                              <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                                {openLdapStatus.config.baseDn ||
                                  t("Not configured", "未設定")}
                              </code>
                            </div>

                            {/* ユーザOU */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Users OU", "ユーザOU")}
                              </p>
                              <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                                {openLdapStatus.config.usersOu ||
                                  t("Not configured", "未設定")}
                              </code>
                            </div>

                            {/* 最終更新 */}
                            <div className="text-right text-xs text-muted-foreground">
                              {t("Last updated", "最終更新")}:{" "}
                              {new Date(
                                openLdapStatus.timestamp,
                              ).toLocaleString(
                                language === "ja" ? "ja-JP" : "en-US",
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            {t(
                              "Click 'Refresh Status' to check the server status",
                              "「状態を更新」をクリックしてサーバの状態を確認してください",
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* OpenLDAPテスト認証（openldapモジュールのみ） */}
                    {selectedModule.id === "openldap" && (
                      <div className="mb-6 p-4 bg-muted border border-border rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
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
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">
                              {t("Test Authentication", "テスト認証")}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {t(
                                "Test user authentication without logging in",
                                "ログインせずにユーザ認証をテストします",
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t("Username", "ユーザ名")}
                              </label>
                              <input
                                type="text"
                                value={testAuthUsername}
                                onChange={(e) =>
                                  setTestAuthUsername(e.target.value)
                                }
                                placeholder={t(
                                  "Enter username",
                                  "ユーザ名を入力",
                                )}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                                disabled={testAuthLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t("Password", "パスワード")}
                              </label>
                              <input
                                type="password"
                                value={testAuthPassword}
                                onChange={(e) =>
                                  setTestAuthPassword(e.target.value)
                                }
                                placeholder={t(
                                  "Enter password",
                                  "パスワードを入力",
                                )}
                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                                disabled={testAuthLoading}
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleTestAuth}
                            disabled={
                              testAuthLoading ||
                              !testAuthUsername ||
                              !testAuthPassword
                            }
                            className="w-full py-2 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
                          >
                            {testAuthLoading
                              ? t("Testing...", "テスト中...")
                              : t("Test Authentication", "認証をテスト")}
                          </button>

                          {/* テスト結果 */}
                          {testAuthResult && (
                            <div
                              className={`p-3 rounded-lg border ${
                                testAuthResult.success
                                  ? "bg-green-50 border-green-200"
                                  : "bg-red-50 border-red-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {testAuthResult.success ? (
                                  <svg
                                    className="w-5 h-5 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-5 h-5 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                )}
                                <span
                                  className={`text-sm font-medium ${testAuthResult.success ? "text-green-800" : "text-red-800"}`}
                                >
                                  {testAuthResult.success
                                    ? language === "ja"
                                      ? testAuthResult.messageJa
                                      : testAuthResult.message
                                    : language === "ja"
                                      ? testAuthResult.errorJa
                                      : testAuthResult.error}
                                </span>
                              </div>
                              {testAuthResult.success &&
                                testAuthResult.user && (
                                  <div className="text-xs text-muted-foreground space-y-1 mt-2 pl-7">
                                    <p>
                                      <span className="font-medium">
                                        {t("Display Name", "表示名")}:
                                      </span>{" "}
                                      {testAuthResult.user.displayName || "-"}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        {t("Email", "メール")}:
                                      </span>{" "}
                                      {testAuthResult.user.email || "-"}
                                    </p>
                                    <p className="truncate">
                                      <span className="font-medium">DN:</span>{" "}
                                      {testAuthResult.user.userDN || "-"}
                                    </p>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* メニュー一覧 */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        {t("Menus", "メニュー")} ({selectedModule.menuCount})
                      </h3>
                      {selectedModule.menus.length > 0 ? (
                        <div className="space-y-2">
                          {selectedModule.menus
                            .sort((a, b) => a.order - b.order)
                            .map((menu) => (
                              <div
                                key={menu.id}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {menu.nameJa}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {menu.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    {menu.path}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* ロールバッジ */}
                                  <div className="flex gap-1">
                                    {menu.requiredRoles.map((role) => (
                                      <span
                                        key={role}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          role === "ADMIN"
                                            ? "bg-red-100 text-red-700"
                                            : role === "MANAGER"
                                              ? "bg-orange-100 text-orange-700"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                    {menu.menuGroup}
                                  </span>
                                  {/* 順序入力 */}
                                  <Input
                                    type="number"
                                    value={menu.order}
                                    onChange={(e) => {
                                      const newOrder = parseInt(e.target.value, 10);
                                      if (!isNaN(newOrder)) {
                                        handleUpdateMenuOrder(menu.id, newOrder);
                                      }
                                    }}
                                    className="w-16 h-7 text-xs text-center"
                                    min={0}
                                    max={999}
                                  />
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      menu.enabled
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {menu.enabled
                                      ? t("Enabled", "有効")
                                      : t("Disabled", "無効")}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {t("No menus", "メニューがありません")}
                        </p>
                      )}
                    </div>

                    {/* コアモジュール注意事項 */}
                    {selectedModule.type === "core" && (
                      <div className="mt-6 p-4 bg-muted border border-border rounded-lg">
                        <div className="flex items-start">
                          <svg
                            className="w-5 h-5 text-muted-foreground mt-0.5 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium mb-1">
                              {t("Core Module", "コアモジュール")}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "This is a core module and cannot be disabled.",
                                "このモジュールはコアモジュールのため、無効化できません。",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* 削除確認モーダル */}
      <Dialog open={showDeleteModal && !!userToDelete} onOpenChange={(open) => !open && closeDeleteModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete User", "ユーザを削除")}</DialogTitle>
            <DialogDescription>
              {userToDelete && t(
                `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone.`,
                `「${userToDelete.name}」を削除してもよろしいですか？この操作は取り消せません。`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? t("Deleting...", "削除中...") : t("Delete", "削除")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
