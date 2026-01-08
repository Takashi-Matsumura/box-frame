"use client";

import type { AccessKey, Role } from "@prisma/client";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaBullhorn, FaClipboardList } from "react-icons/fa";
import { AccessKeyManager } from "@/components/AccessKeyManager";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
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
import { ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { getModuleIcon } from "@/lib/modules/icons";
import type { AppMenu, AppModule } from "@/types/module";

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
  modules: AppModule[];
}

type TabType = "system" | "users" | "access-keys" | "modules" | "audit-logs" | "announcements";

interface ContainerStatus {
  id: string;
  name: string;
  nameJa: string;
  required: boolean;
  description?: string;
  descriptionJa?: string;
  isRunning: boolean;
}

interface McpServerInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  path: string;
  toolCount: number;
  readOnly: boolean;
  tools: Array<{
    name: string;
    descriptionJa: string;
  }>;
}

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
  containers: ContainerStatus[];
  mcpServer: McpServerInfo | null;
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
  modules,
}: AdminClientProps) {
  const searchParams = useSearchParams();
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  const isTabletOrMobile = useIsTabletOrMobile();
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

  // GitHub OAuth設定
  const [gitHubOAuthEnabled, setGitHubOAuthEnabled] = useState(false);
  const [gitHubOAuthLoading, setGitHubOAuthLoading] = useState(false);

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

  // 監査ログの状態
  interface AuditLog {
    id: string;
    action: string;
    category: string;
    userId: string | null;
    targetId: string | null;
    targetType: string | null;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  }

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [auditLogsCategoryFilter, setAuditLogsCategoryFilter] = useState<string>("ALL");
  const [auditLogsActionFilter, setAuditLogsActionFilter] = useState<string>("ALL");

  // アナウンスの状態
  interface Announcement {
    id: string;
    title: string;
    titleJa: string | null;
    message: string;
    messageJa: string | null;
    level: string;
    isActive: boolean;
    startAt: string;
    endAt: string | null;
    createdAt: string;
    creator: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    titleJa: "",
    message: "",
    messageJa: "",
    level: "info",
    startAt: "",
    endAt: "",
  });
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [showAnnouncementDeleteModal, setShowAnnouncementDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [announcementDeleting, setAnnouncementDeleting] = useState(false);

  // AI設定の状態
  interface AIConfig {
    enabled: boolean;
    provider: "openai" | "anthropic" | "local";
    apiKey: string | null;
    hasApiKey: boolean;
    model: string;
    // ローカルLLM設定
    localProvider: "llama.cpp" | "lm-studio" | "ollama";
    localEndpoint: string;
    localModel: string;
  }

  interface LocalLLMDefaults {
    [key: string]: { endpoint: string; model: string };
  }

  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [localLLMDefaults, setLocalLLMDefaults] = useState<LocalLLMDefaults | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  // アナウンス用AI翻訳
  const [aiTranslationAvailable, setAiTranslationAvailable] = useState(false);
  const [useAiTranslation, setUseAiTranslation] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // datetime-local入力用にローカル時刻をフォーマット (YYYY-MM-DDTHH:MM)
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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

  // GitHub OAuth設定を取得
  const fetchGitHubOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/github-oauth");
      if (response.ok) {
        const data = await response.json();
        setGitHubOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching GitHub OAuth setting:", error);
    }
  }, []);

  // GitHub OAuth設定を切り替え
  const handleGitHubOAuthToggle = useCallback(async (enabled: boolean) => {
    setGitHubOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/github-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGitHubOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating GitHub OAuth setting:", error);
    } finally {
      setGitHubOAuthLoading(false);
    }
  }, []);

  // システムタブが表示された時にOAuth設定を取得
  useEffect(() => {
    if (activeTab === "system") {
      fetchGoogleOAuthSetting();
      fetchGitHubOAuthSetting();
    }
  }, [activeTab, fetchGoogleOAuthSetting, fetchGitHubOAuthSetting]);

  // 監査ログを取得
  const fetchAuditLogs = useCallback(async () => {
    if (activeTab !== "audit-logs") return;

    try {
      setAuditLogsLoading(true);
      const params = new URLSearchParams({
        page: auditLogsPage.toString(),
        limit: "25",
        ...(auditLogsCategoryFilter !== "ALL" && { category: auditLogsCategoryFilter }),
        ...(auditLogsActionFilter !== "ALL" && { action: auditLogsActionFilter }),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setAuditLogs(data.logs);
      setAuditLogsTotal(data.total);
      setAuditLogsTotalPages(Math.ceil(data.total / 25));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [activeTab, auditLogsPage, auditLogsCategoryFilter, auditLogsActionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // アナウンスを取得
  const fetchAnnouncements = useCallback(async () => {
    if (activeTab !== "announcements") return;

    try {
      setAnnouncementsLoading(true);
      const response = await fetch("/api/admin/announcements");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }

      const data = await response.json();
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // アナウンスモーダルを開く（新規作成）
  const openNewAnnouncementModal = async () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({
      title: "",
      titleJa: "",
      message: "",
      messageJa: "",
      level: "info",
      startAt: formatLocalDateTime(new Date()),
      endAt: "",
    });
    setUseAiTranslation(false);
    setShowAnnouncementModal(true);

    // AI翻訳の利用可否をチェック
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
        if (data.available) {
          setUseAiTranslation(true); // デフォルトでON
        }
      }
    } catch {
      setAiTranslationAvailable(false);
    }
  };

  // アナウンスモーダルを開く（編集）
  const openEditAnnouncementModal = async (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      titleJa: announcement.titleJa || "",
      message: announcement.message,
      messageJa: announcement.messageJa || "",
      level: announcement.level,
      startAt: formatLocalDateTime(new Date(announcement.startAt)),
      endAt: announcement.endAt ? formatLocalDateTime(new Date(announcement.endAt)) : "",
    });
    setUseAiTranslation(false);
    setShowAnnouncementModal(true);

    // AI翻訳の利用可否をチェック
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
      }
    } catch {
      setAiTranslationAvailable(false);
    }
  };

  // アナウンスを保存
  const handleSaveAnnouncement = async () => {
    if (!announcementForm.titleJa || !announcementForm.messageJa) {
      alert(t("Title and message are required", "タイトルとメッセージは必須です"));
      return;
    }

    try {
      setAnnouncementSaving(true);

      let titleEn = announcementForm.title;
      let messageEn = announcementForm.message;

      // AI翻訳が有効で、英語フィールドが空の場合は翻訳を実行
      if (useAiTranslation && aiTranslationAvailable) {
        if (!titleEn && announcementForm.titleJa) {
          setAiTranslating(true);
          try {
            const response = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: announcementForm.titleJa,
                sourceLanguage: "ja",
                targetLanguage: "en",
              }),
            });
            if (response.ok) {
              const data = await response.json();
              titleEn = data.translatedText;
            }
          } catch (error) {
            console.error("Error translating title:", error);
          }
        }

        if (!messageEn && announcementForm.messageJa) {
          try {
            const response = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: announcementForm.messageJa,
                sourceLanguage: "ja",
                targetLanguage: "en",
              }),
            });
            if (response.ok) {
              const data = await response.json();
              messageEn = data.translatedText;
            }
          } catch (error) {
            console.error("Error translating message:", error);
          }
        }
        setAiTranslating(false);
      }

      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : "/api/admin/announcements";
      const method = editingAnnouncement ? "PATCH" : "POST";

      // 日本語が必須、英語は任意（翻訳結果または日本語をフォールバック）
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleEn || announcementForm.titleJa,
          titleJa: announcementForm.titleJa,
          message: messageEn || announcementForm.messageJa,
          messageJa: announcementForm.messageJa,
          level: announcementForm.level,
          startAt: announcementForm.startAt,
          endAt: announcementForm.endAt || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save announcement");
      }

      setShowAnnouncementModal(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert(t("Failed to save announcement", "アナウンスの保存に失敗しました"));
    } finally {
      setAnnouncementSaving(false);
    }
  };

  // アナウンスの有効/無効を切り替え
  const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update announcement");
      }

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a))
      );
    } catch (error) {
      console.error("Error toggling announcement:", error);
      alert(t("Failed to update announcement", "アナウンスの更新に失敗しました"));
    }
  };

  // アナウンスを削除
  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      setAnnouncementDeleting(true);
      const response = await fetch(`/api/admin/announcements/${announcementToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete announcement");
      }

      setShowAnnouncementDeleteModal(false);
      setAnnouncementToDelete(null);
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert(t("Failed to delete announcement", "アナウンスの削除に失敗しました"));
    } finally {
      setAnnouncementDeleting(false);
    }
  };

  // AI設定を取得
  const fetchAiConfig = useCallback(async () => {
    if (activeTab !== "system") return;

    try {
      setAiConfigLoading(true);
      const response = await fetch("/api/admin/ai");
      if (!response.ok) {
        throw new Error("Failed to fetch AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      if (data.localLLMDefaults) {
        setLocalLLMDefaults(data.localLLMDefaults);
      }
    } catch (error) {
      console.error("Error fetching AI config:", error);
    } finally {
      setAiConfigLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAiConfig();
  }, [fetchAiConfig]);

  // AI設定を更新
  const handleUpdateAiConfig = async (updates: Partial<AIConfig & { apiKey?: string }>) => {
    try {
      setAiSaving(true);
      const response = await fetch("/api/admin/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      setAiApiKeyInput("");
      setConnectionTestResult(null);
    } catch (error) {
      console.error("Error updating AI config:", error);
      alert(t("Failed to update AI settings", "AI設定の更新に失敗しました"));
    } finally {
      setAiSaving(false);
    }
  };

  // ローカルLLM接続テスト
  const handleTestLocalConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionTestResult(null);

      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection" }),
      });

      const result = await response.json();
      setConnectionTestResult(result);
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionTestResult({
        success: false,
        message: t("Connection test failed", "接続テストに失敗しました"),
      });
    } finally {
      setTestingConnection(false);
    }
  };

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

  // メニューの有効/無効を切り替え
  const handleToggleMenu = useCallback(async (menuId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update menu");
      }

      // ローカルの状態を更新
      setModulesData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            menus: m.menus.map((menu) =>
              menu.id === menuId ? { ...menu, enabled } : menu
            ),
            menuCount: m.menus.filter((menu) =>
              menu.id === menuId ? enabled : menu.enabled
            ).length,
          })),
        };
      });

      // 選択中のモジュールも更新
      setSelectedModule((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          menus: prev.menus.map((menu) =>
            menu.id === menuId ? { ...menu, enabled } : menu
          ),
          menuCount: prev.menus.filter((menu) =>
            menu.id === menuId ? enabled : menu.enabled
          ).length,
        };
      });
    } catch (error) {
      console.error("Error toggling menu:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to update menu",
          error instanceof Error ? error.message : "メニューの更新に失敗しました"
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

  // ヘッダーの高さを計算（タブがある場合は高くなる）
  // ヘッダー本体: 約72px + タブナビ: 約44px = 約116px ≈ 7.25rem
  const headerHeight = "7.25rem";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{
        top: headerHeight,
        left: isTabletOrMobile ? "0" : open ? `${width}px` : "4rem",
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* システム情報タブ */}
          {activeTab === "system" && (
            <Card>
              <CardContent className="p-8">
              {/* 統計カード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <Card>
                  <CardContent className="py-2 px-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("Total Users", "総ユーザ数")}
                    </span>
                    <span className="text-2xl font-bold">
                      {initialStats.totalUsers}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-2 px-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("Regular Users", "一般ユーザ")}
                    </span>
                    <span className="text-2xl font-bold">
                      {initialStats.userCount}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-2 px-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("Administrators", "管理者")}
                    </span>
                    <span className="text-2xl font-bold">
                      {initialStats.adminCount}
                    </span>
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

                {/* GitHub OAuth */}
                <div className="p-6 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        GitHub OAuth
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(
                          "Enable GitHub OAuth login on the login page",
                          "ログイン画面でGitHub OAuthログインを有効にする"
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={gitHubOAuthEnabled}
                      onCheckedChange={handleGitHubOAuthToggle}
                      disabled={gitHubOAuthLoading}
                    />
                  </div>
                  {!gitHubOAuthEnabled && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                      {t(
                        "To enable GitHub OAuth, configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment variables.",
                        "GitHub OAuthを有効にするには、環境変数にGITHUB_CLIENT_IDとGITHUB_CLIENT_SECRETを設定してください。"
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* AI設定 */}
              <div className="space-y-4 mt-8">
                <h2 className="text-2xl font-semibold">
                  {t("AI Settings", "AI設定")}
                </h2>

                {aiConfigLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("Loading...", "読み込み中...")}
                    </p>
                  </div>
                )}

                {!aiConfigLoading && aiConfig && (
                  <div className="space-y-4">
                    {/* 有効/無効 */}
                    <div className="p-6 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {t("Enable AI Features", "AI機能を有効化")}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t(
                              "Enable AI-powered features like translation.",
                              "翻訳などのAI機能を有効にします。"
                            )}
                          </p>
                        </div>
                        <Switch
                          checked={aiConfig.enabled}
                          onCheckedChange={(checked) => handleUpdateAiConfig({ enabled: checked })}
                          disabled={aiSaving}
                        />
                      </div>
                    </div>

                    {/* プロバイダ選択 */}
                    <div className="p-6 bg-muted rounded-lg space-y-4">
                      <div className="space-y-2">
                        <Label>{t("AI Provider", "AIプロバイダ")}</Label>
                        <Select
                          value={aiConfig.provider}
                          onValueChange={(value) => handleUpdateAiConfig({ provider: value as "openai" | "anthropic" | "local" })}
                          disabled={aiSaving}
                        >
                          <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">
                              {t("Local LLM", "ローカルLLM")} ({t("Recommended", "推奨")})
                            </SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {aiConfig.provider === "local" && t(
                            "Uses a local LLM server. No API key required.",
                            "ローカルLLMサーバを使用します。APIキー不要です。"
                          )}
                          {aiConfig.provider === "openai" && t(
                            "Uses OpenAI GPT models for AI features.",
                            "OpenAI GPTモデルを使用します。"
                          )}
                          {aiConfig.provider === "anthropic" && t(
                            "Uses Anthropic Claude models for AI features.",
                            "Anthropic Claudeモデルを使用します。"
                          )}
                        </p>
                      </div>

                      {/* ローカルLLM設定 */}
                      {aiConfig.provider === "local" && (
                        <>
                          {/* ローカルプロバイダ選択 */}
                          <div className="space-y-2">
                            <Label>{t("Local LLM Server", "ローカルLLMサーバ")}</Label>
                            <Select
                              value={aiConfig.localProvider}
                              onValueChange={(value) => {
                                const provider = value as "llama.cpp" | "lm-studio" | "ollama";
                                const defaults = localLLMDefaults?.[provider];
                                handleUpdateAiConfig({
                                  localProvider: provider,
                                  localEndpoint: defaults?.endpoint || "",
                                  localModel: defaults?.model || "",
                                });
                              }}
                              disabled={aiSaving}
                            >
                              <SelectTrigger className="w-full md:w-[300px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="llama.cpp">llama.cpp ({t("Default", "デフォルト")})</SelectItem>
                                <SelectItem value="lm-studio">LM Studio</SelectItem>
                                <SelectItem value="ollama">Ollama</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* エンドポイントURL */}
                          <div className="space-y-2">
                            <Label>{t("Endpoint URL", "エンドポイントURL")}</Label>
                            <Input
                              value={aiConfig.localEndpoint}
                              onChange={(e) => handleUpdateAiConfig({ localEndpoint: e.target.value })}
                              placeholder={localLLMDefaults?.[aiConfig.localProvider]?.endpoint || ""}
                              className="font-mono"
                              disabled={aiSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                              {aiConfig.localProvider === "llama.cpp" && t(
                                "Default: http://localhost:8080/v1/chat/completions",
                                "デフォルト: http://localhost:8080/v1/chat/completions"
                              )}
                              {aiConfig.localProvider === "lm-studio" && t(
                                "Default: http://localhost:1234/v1/chat/completions",
                                "デフォルト: http://localhost:1234/v1/chat/completions"
                              )}
                              {aiConfig.localProvider === "ollama" && t(
                                "Default: http://localhost:11434/api/chat",
                                "デフォルト: http://localhost:11434/api/chat"
                              )}
                            </p>
                          </div>

                          {/* モデル名 */}
                          <div className="space-y-2">
                            <Label>{t("Model Name", "モデル名")}</Label>
                            <Input
                              value={aiConfig.localModel}
                              onChange={(e) => handleUpdateAiConfig({ localModel: e.target.value })}
                              placeholder={localLLMDefaults?.[aiConfig.localProvider]?.model || "default"}
                              disabled={aiSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                              {aiConfig.localProvider === "ollama"
                                ? t("e.g., llama3.2, gemma2, mistral", "例: llama3.2, gemma2, mistral")
                                : t("Leave as 'default' to use the loaded model", "ロード済みモデルを使用する場合は 'default' のまま")}
                            </p>
                          </div>

                          {/* 接続テスト */}
                          <div className="flex items-center gap-4">
                            <Button
                              variant="outline"
                              onClick={handleTestLocalConnection}
                              disabled={testingConnection || aiSaving}
                            >
                              {testingConnection
                                ? t("Testing...", "テスト中...")
                                : t("Test Connection", "接続テスト")}
                            </Button>
                            {connectionTestResult && (
                              <span className={`text-sm ${connectionTestResult.success ? "text-green-600" : "text-red-600"}`}>
                                {connectionTestResult.success ? "✓ " : "✗ "}
                                {connectionTestResult.message}
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {/* クラウドAPI設定 */}
                      {aiConfig.provider !== "local" && (
                        <>
                          {/* モデル選択 */}
                          <div className="space-y-2">
                            <Label>{t("Model", "モデル")}</Label>
                            <Select
                              value={aiConfig.model}
                              onValueChange={(value) => handleUpdateAiConfig({ model: value })}
                              disabled={aiSaving}
                            >
                              <SelectTrigger className="w-full md:w-[300px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {aiConfig.provider === "openai" && (
                                  <>
                                    <SelectItem value="gpt-4o-mini">GPT-4o mini ({t("Recommended", "推奨")})</SelectItem>
                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                  </>
                                )}
                                {aiConfig.provider === "anthropic" && (
                                  <>
                                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku ({t("Recommended", "推奨")})</SelectItem>
                                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* APIキー */}
                          <div className="space-y-2">
                            <Label>{t("API Key", "APIキー")}</Label>
                            {aiConfig.hasApiKey ? (
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Input
                                    value={aiConfig.apiKey || ""}
                                    disabled
                                    className="font-mono"
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => handleUpdateAiConfig({ apiKey: "" })}
                                  disabled={aiSaving}
                                >
                                  {t("Remove", "削除")}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Input
                                    type="password"
                                    value={aiApiKeyInput}
                                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                                    placeholder={
                                      aiConfig.provider === "openai"
                                        ? "sk-..."
                                        : aiConfig.provider === "anthropic"
                                          ? "sk-ant-..."
                                          : ""
                                    }
                                    className="font-mono"
                                  />
                                </div>
                                <Button
                                  onClick={() => handleUpdateAiConfig({ apiKey: aiApiKeyInput })}
                                  disabled={aiSaving || !aiApiKeyInput}
                                >
                                  {aiSaving ? t("Saving...", "保存中...") : t("Save", "保存")}
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {aiConfig.provider === "openai" && (
                                <>
                                  {t("Get your API key from ", "APIキーは ")}
                                  <a
                                    href="https://platform.openai.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    OpenAI Platform
                                  </a>
                                  {t(" to use AI features.", " から取得できます。")}
                                </>
                              )}
                              {aiConfig.provider === "anthropic" && (
                                <>
                                  {t("Get your API key from ", "APIキーは ")}
                                  <a
                                    href="https://console.anthropic.com/settings/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Anthropic Console
                                  </a>
                                  {t(" to use AI features.", " から取得できます。")}
                                </>
                              )}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ステータス */}
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          aiConfig.enabled && (aiConfig.provider === "local" ? !!aiConfig.localEndpoint : aiConfig.hasApiKey)
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`} />
                        <span className="font-medium">
                          {aiConfig.enabled && (aiConfig.provider === "local" ? !!aiConfig.localEndpoint : aiConfig.hasApiKey)
                            ? t("AI features are ready to use", "AI機能が利用可能です")
                            : !aiConfig.enabled
                              ? t("AI features are disabled", "AI機能が無効です")
                              : aiConfig.provider === "local"
                                ? t("Endpoint is not configured", "エンドポイントが設定されていません")
                                : t("API key is not configured", "APIキーが設定されていません")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                      <SelectItem value="EXECUTIVE">{t("Executive", "役員")}</SelectItem>
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
                  modules={modules}
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
                                      {language === "ja" ? module.nameJa : module.name}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {language === "ja" ? module.name : module.nameJa}
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
                              {(language === "ja" ? module.descriptionJa : module.description) && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {language === "ja" ? module.descriptionJa : module.description}
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

                              {/* コンテナ・MCPサーバステータス（シンプル表示） */}
                              {(module.containers?.length > 0 || module.mcpServer) && (
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
                                  {/* コンテナステータス */}
                                  {module.containers && module.containers.length > 0 && (() => {
                                    const allRunning = module.containers.every(c => c.isRunning);
                                    const hasRequiredStopped = module.containers.some(c => !c.isRunning && c.required);
                                    return (
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                                        </svg>
                                        <span className="text-muted-foreground">{t("Container", "コンテナ")}</span>
                                        <span className={`flex items-center gap-1 ${allRunning ? "text-green-600" : "text-amber-600"}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${allRunning ? "bg-green-500" : "bg-amber-500"}`} />
                                          {allRunning ? t("Running", "稼働中") : t("Stopped", "停止中")}
                                          {hasRequiredStopped && <span>⚠️</span>}
                                        </span>
                                      </div>
                                    );
                                  })()}

                                  {/* MCPサーバー */}
                                  {module.mcpServer && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-muted-foreground">{t("MCP", "MCP")}</span>
                                      <span className="text-blue-600">
                                        {module.mcpServer.toolCount} {t("tools", "ツール")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

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
                        {language === "ja" ? selectedModule.nameJa : selectedModule.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "ja" ? selectedModule.name : selectedModule.nameJa}
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
                          {(language === "ja" ? selectedModule.descriptionJa : selectedModule.description) || t("None", "なし")}
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

                    {/* MCPサーバー詳細 */}
                    {selectedModule.mcpServer && (
                      <div className="mb-6 p-4 bg-muted border border-border rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
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
                                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">
                              {language === "ja"
                                ? selectedModule.mcpServer.nameJa
                                : selectedModule.mcpServer.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {t(
                                "MCP Server for external AI integration",
                                "外部AI連携用MCPサーバ",
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* 説明 */}
                          {(language === "ja"
                            ? selectedModule.mcpServer.descriptionJa
                            : selectedModule.mcpServer.description) && (
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Description", "説明")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {language === "ja"
                                  ? selectedModule.mcpServer.descriptionJa
                                  : selectedModule.mcpServer.description}
                              </p>
                            </div>
                          )}

                          {/* ツール一覧 */}
                          <div className="p-3 bg-card rounded-lg border border-border">
                            <p className="text-sm font-medium mb-2">
                              {t("Tools", "ツール")} ({selectedModule.mcpServer.toolCount})
                            </p>
                            <div className="space-y-1.5">
                              {selectedModule.mcpServer.tools.map((tool) => (
                                <div key={tool.name} className="flex items-center gap-2 text-xs">
                                  <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                                    {tool.name}
                                  </code>
                                  <span className="text-muted-foreground">
                                    {tool.descriptionJa}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* アクセスモード */}
                          <div className="p-3 bg-card rounded-lg border border-border">
                            <p className="text-sm font-medium mb-1">
                              {t("Access Mode", "アクセスモード")}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                selectedModule.mcpServer.readOnly
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {selectedModule.mcpServer.readOnly
                                ? t("Read Only", "読み取り専用")
                                : t("Read/Write", "読み書き可能")}
                            </span>
                          </div>

                          {/* パス */}
                          <div className="p-3 bg-card rounded-lg border border-border">
                            <p className="text-sm font-medium mb-1">
                              {t("Server Path", "サーバパス")}
                            </p>
                            <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                              {selectedModule.mcpServer.path}
                            </code>
                          </div>
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
                                    {language === "ja" ? menu.nameJa : menu.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {language === "ja" ? menu.name : menu.nameJa}
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
                                            : role === "EXECUTIVE"
                                              ? "bg-rose-100 text-rose-700"
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
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={menu.enabled}
                                      onCheckedChange={(checked) => handleToggleMenu(menu.id, checked)}
                                      className="scale-75"
                                    />
                                    <span className={`text-xs ${menu.enabled ? "text-green-700" : "text-muted-foreground"}`}>
                                      {menu.enabled ? t("Enabled", "有効") : t("Disabled", "無効")}
                                    </span>
                                  </div>
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

          {/* 監査ログタブ */}
          {activeTab === "audit-logs" && (
            <Card>
              <CardContent className="p-6">
                {/* フィルター */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("Category", "カテゴリ")}:
                    </Label>
                    <Select
                      value={auditLogsCategoryFilter}
                      onValueChange={(value) => {
                        setAuditLogsCategoryFilter(value);
                        setAuditLogsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("All Categories", "すべてのカテゴリ")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("All", "すべて")}</SelectItem>
                        <SelectItem value="AUTH">{t("Authentication", "認証")}</SelectItem>
                        <SelectItem value="USER_MANAGEMENT">{t("User Management", "ユーザ管理")}</SelectItem>
                        <SelectItem value="SYSTEM_SETTING">{t("System Settings", "システム設定")}</SelectItem>
                        <SelectItem value="MODULE">{t("Module", "モジュール")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("Action", "アクション")}:
                    </Label>
                    <Select
                      value={auditLogsActionFilter}
                      onValueChange={(value) => {
                        setAuditLogsActionFilter(value);
                        setAuditLogsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("All Actions", "すべてのアクション")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("All", "すべて")}</SelectItem>
                        <SelectItem value="LOGIN_SUCCESS">{t("Login Success", "ログイン成功")}</SelectItem>
                        <SelectItem value="LOGIN_FAILURE">{t("Login Failure", "ログイン失敗")}</SelectItem>
                        <SelectItem value="LOGOUT">{t("Logout", "ログアウト")}</SelectItem>
                        <SelectItem value="USER_CREATE">{t("User Create", "ユーザ作成")}</SelectItem>
                        <SelectItem value="USER_DELETE">{t("User Delete", "ユーザ削除")}</SelectItem>
                        <SelectItem value="USER_ROLE_CHANGE">{t("Role Change", "ロール変更")}</SelectItem>
                        <SelectItem value="MODULE_TOGGLE">{t("Module Toggle", "モジュール切替")}</SelectItem>
                        <SelectItem value="MENU_TOGGLE">{t("Menu Toggle", "メニュー切替")}</SelectItem>
                        <SelectItem value="ANNOUNCEMENT_CREATE">{t("Announcement Create", "アナウンス作成")}</SelectItem>
                        <SelectItem value="ANNOUNCEMENT_UPDATE">{t("Announcement Update", "アナウンス更新")}</SelectItem>
                        <SelectItem value="ANNOUNCEMENT_DELETE">{t("Announcement Delete", "アナウンス削除")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ローディング */}
                {auditLogsLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                      {t("Loading...", "読み込み中...")}
                    </p>
                  </div>
                )}

                {/* ログテーブル */}
                {!auditLogsLoading && auditLogs.length > 0 && (
                  <>
                    {/* ページネーション（上部） */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {t("Total", "合計")}: <span className="font-medium text-foreground">{auditLogsTotal}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditLogsPage((p) => Math.max(1, p - 1))}
                          disabled={auditLogsPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("Previous", "前へ")}
                        </Button>
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-sm font-medium">{auditLogsPage}</span>
                          <span className="text-sm text-muted-foreground">/</span>
                          <span className="text-sm text-muted-foreground">{auditLogsTotalPages || 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditLogsPage((p) => Math.min(auditLogsTotalPages, p + 1))}
                          disabled={auditLogsPage >= auditLogsTotalPages}
                          className="gap-1"
                        >
                          {t("Next", "次へ")}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* テーブル */}
                    <div className="rounded-lg border overflow-hidden">
                      <div className="overflow-y-auto max-h-[calc(100vh-28rem)]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/50 z-10">
                            <TableRow>
                              <TableHead className="w-[160px]">{t("Date/Time", "日時")}</TableHead>
                              <TableHead className="w-[140px]">{t("Category", "カテゴリ")}</TableHead>
                              <TableHead className="w-[160px]">{t("Action", "アクション")}</TableHead>
                              <TableHead className="w-[180px]">{t("User", "ユーザ")}</TableHead>
                              <TableHead>{t("Details", "詳細")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditLogs.map((log) => {
                              const details = log.details ? JSON.parse(log.details) : null;
                              const isSuccess = log.action.includes("SUCCESS") || log.action.includes("CREATE");
                              const isFailure = log.action.includes("FAILURE") || log.action.includes("DELETE");

                              return (
                                <TableRow key={log.id}>
                                  <TableCell className="text-sm">
                                    {new Date(log.createdAt).toLocaleString(
                                      language === "ja" ? "ja-JP" : "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={
                                      log.category === "AUTH"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : log.category === "USER_MANAGEMENT"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : log.category === "SYSTEM_SETTING"
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-orange-50 text-orange-700 border-orange-200"
                                    }>
                                      {log.category === "AUTH" && t("Auth", "認証")}
                                      {log.category === "USER_MANAGEMENT" && t("User", "ユーザ")}
                                      {log.category === "SYSTEM_SETTING" && t("System", "システム")}
                                      {log.category === "MODULE" && t("Module", "モジュール")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={
                                      isSuccess
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : isFailure
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                    }>
                                      {log.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {log.user ? (
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{log.user.name || "-"}</span>
                                        <span className="text-xs text-muted-foreground">{log.user.email}</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {details && (
                                      <div className="text-xs text-muted-foreground space-y-0.5">
                                        {details.provider && (
                                          <p>{t("Provider", "プロバイダ")}: {details.provider}</p>
                                        )}
                                        {details.username && (
                                          <p>{t("Username", "ユーザ名")}: {details.username}</p>
                                        )}
                                        {details.email && !log.user?.email && (
                                          <p>{t("Email", "メール")}: {details.email}</p>
                                        )}
                                        {details.reason && (
                                          <p className="text-red-600">{t("Reason", "理由")}: {details.reason}</p>
                                        )}
                                        {details.title && (
                                          <p>{t("Title", "タイトル")}: {details.title}</p>
                                        )}
                                        {details.oldRole && details.newRole && (
                                          <p>{details.oldRole} → {details.newRole}</p>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* データなし */}
                {!auditLogsLoading && auditLogs.length === 0 && (
                  <div className="text-center py-12">
                    <FaClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t("No audit logs found", "監査ログがありません")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* アナウンスタブ */}
          {activeTab === "announcements" && (
            <Card>
              <CardContent className="p-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {t("System Announcements", "システムアナウンス")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "Create and manage system-wide announcements.",
                        "システム全体のアナウンスを作成・管理できます。"
                      )}
                    </p>
                  </div>
                  <Button onClick={openNewAnnouncementModal} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("New Announcement", "新規作成")}
                  </Button>
                </div>

                {/* ローディング */}
                {announcementsLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                      {t("Loading...", "読み込み中...")}
                    </p>
                  </div>
                )}

                {/* アナウンス一覧 */}
                {!announcementsLoading && announcements.length > 0 && (
                  <div className="space-y-4">
                    {announcements.map((announcement) => {
                      const now = new Date();
                      const startAt = new Date(announcement.startAt);
                      const endAt = announcement.endAt ? new Date(announcement.endAt) : null;
                      const isScheduled = startAt > now;
                      const isExpired = endAt && endAt < now;
                      const isLive = announcement.isActive && !isScheduled && !isExpired;

                      return (
                        <div
                          key={announcement.id}
                          className={`p-4 rounded-lg border ${
                            announcement.level === "critical"
                              ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                              : announcement.level === "warning"
                                ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                                : "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                          } ${!announcement.isActive && "opacity-60"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={
                                  announcement.level === "critical"
                                    ? "bg-red-100 text-red-700 border-red-300"
                                    : announcement.level === "warning"
                                      ? "bg-amber-100 text-amber-700 border-amber-300"
                                      : "bg-blue-100 text-blue-700 border-blue-300"
                                }>
                                  {announcement.level === "critical" && t("Critical", "重要")}
                                  {announcement.level === "warning" && t("Warning", "警告")}
                                  {announcement.level === "info" && t("Info", "お知らせ")}
                                </Badge>
                                {isLive && (
                                  <Badge className="bg-green-100 text-green-700 border-green-300">
                                    {t("Live", "配信中")}
                                  </Badge>
                                )}
                                {isScheduled && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                                    {t("Scheduled", "予約済み")}
                                  </Badge>
                                )}
                                {isExpired && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">
                                    {t("Expired", "終了")}
                                  </Badge>
                                )}
                              </div>

                              <h4 className="font-semibold text-foreground mb-1">
                                {language === "ja" && announcement.titleJa ? announcement.titleJa : announcement.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {language === "ja" && announcement.messageJa ? announcement.messageJa : announcement.message}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {t("Start", "開始")}: {new Date(announcement.startAt).toLocaleString(
                                    language === "ja" ? "ja-JP" : "en-US",
                                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                  )}
                                </span>
                                {announcement.endAt && (
                                  <span>
                                    {t("End", "終了")}: {new Date(announcement.endAt).toLocaleString(
                                      language === "ja" ? "ja-JP" : "en-US",
                                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </span>
                                )}
                                <span>
                                  {t("By", "作成者")}: {announcement.creator.name || announcement.creator.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={announcement.isActive}
                                onCheckedChange={(checked) => handleToggleAnnouncement(announcement.id, checked)}
                              />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditAnnouncementModal(announcement)}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Edit", "編集")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        setAnnouncementToDelete(announcement);
                                        setShowAnnouncementDeleteModal(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Delete", "削除")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* データなし */}
                {!announcementsLoading && announcements.length === 0 && (
                  <div className="text-center py-12">
                    <FaBullhorn className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t("No announcements yet", "アナウンスはまだありません")}
                    </p>
                    <Button onClick={openNewAnnouncementModal} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("Create First Announcement", "最初のアナウンスを作成")}
                    </Button>
                  </div>
                )}
              </CardContent>
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

      {/* アナウンス作成/編集モーダル */}
      <Dialog open={showAnnouncementModal} onOpenChange={(open) => !open && setShowAnnouncementModal(false)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement
                ? t("Edit Announcement", "アナウンスを編集")
                : t("New Announcement", "新規アナウンス")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Create announcements to notify all users about important information.",
                "重要な情報を全ユーザに通知するアナウンスを作成します。"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* タイトル（日本語） */}
            <div className="space-y-2">
              <Label htmlFor="titleJa">{t("Title (Japanese)", "タイトル（日本語）")} *</Label>
              <Input
                id="titleJa"
                value={announcementForm.titleJa}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, titleJa: e.target.value }))}
                placeholder={t("Enter title in Japanese", "日本語でタイトルを入力")}
              />
            </div>

            {/* タイトル（英語） */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("Title (English)", "タイトル（英語）")}</Label>
              <Input
                id="title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("Enter title in English (optional)", "英語でタイトルを入力（任意）")}
              />
            </div>

            {/* メッセージ（日本語） */}
            <div className="space-y-2">
              <Label htmlFor="messageJa">{t("Message (Japanese)", "メッセージ（日本語）")} *</Label>
              <Input
                id="messageJa"
                value={announcementForm.messageJa}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, messageJa: e.target.value }))}
                placeholder={t("Enter message in Japanese", "日本語でメッセージを入力")}
              />
            </div>

            {/* メッセージ（英語） */}
            <div className="space-y-2">
              <Label htmlFor="message">{t("Message (English)", "メッセージ（英語）")}</Label>
              <Input
                id="message"
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t("Enter message in English (optional)", "英語でメッセージを入力（任意）")}
              />
            </div>

            {/* レベル */}
            <div className="space-y-2">
              <Label>{t("Level", "重要度")}</Label>
              <Select
                value={announcementForm.level}
                onValueChange={(value) => setAnnouncementForm((f) => ({ ...f, level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t("Info", "お知らせ")}</SelectItem>
                  <SelectItem value="warning">{t("Warning", "警告")}</SelectItem>
                  <SelectItem value="critical">{t("Critical", "重要")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI翻訳トグル */}
            {aiTranslationAvailable && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t("AI Translation", "AI翻訳")}
                    </Label>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t(
                        "Automatically translate to English if empty",
                        "英語が空の場合、自動で翻訳します"
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={useAiTranslation}
                  onCheckedChange={setUseAiTranslation}
                  disabled={announcementSaving || aiTranslating}
                />
              </div>
            )}

            {/* 開始日時・終了日時 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startAt">{t("Start Date/Time", "開始日時")}</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={announcementForm.startAt}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">{t("End Date/Time", "終了日時")}</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={announcementForm.endAt}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, endAt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("Leave empty for no end date", "空欄の場合は終了日時なし")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnnouncementModal(false)}
              disabled={announcementSaving || aiTranslating}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              onClick={handleSaveAnnouncement}
              disabled={announcementSaving || aiTranslating || !announcementForm.titleJa || !announcementForm.messageJa}
            >
              {aiTranslating
                ? t("Translating...", "翻訳中...")
                : announcementSaving
                  ? t("Saving...", "保存中...")
                  : editingAnnouncement
                    ? t("Update", "更新")
                    : t("Create", "作成")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* アナウンス削除確認モーダル */}
      <Dialog
        open={showAnnouncementDeleteModal && !!announcementToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setShowAnnouncementDeleteModal(false);
            setAnnouncementToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete Announcement", "アナウンスを削除")}</DialogTitle>
            <DialogDescription>
              {announcementToDelete && t(
                `Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone.`,
                `「${announcementToDelete.title}」を削除してもよろしいですか？この操作は取り消せません。`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAnnouncementDeleteModal(false);
                setAnnouncementToDelete(null);
              }}
              disabled={announcementDeleting}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAnnouncement}
              disabled={announcementDeleting}
            >
              {announcementDeleting ? t("Deleting...", "削除中...") : t("Delete", "削除")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
