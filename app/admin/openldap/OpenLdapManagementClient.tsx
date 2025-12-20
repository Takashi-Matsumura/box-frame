"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
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

interface LdapUser {
  uid: string;
  dn: string;
  cn: string;
  sn: string;
  displayName?: string;
  mail?: string;
}

interface OpenLdapManagementClientProps {
  language: "en" | "ja";
  tab: "users" | "accesskeys" | "migration" | "settings";
}

type McpPermission = "READ_ONLY" | "FULL_ACCESS";

interface AccessKey {
  id: string;
  name: string;
  key: string;
  permission: McpPermission;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

interface McpToolParam {
  name: string;
  type: string;
  required?: boolean;
  optional?: boolean;
  default?: unknown;
  description: string;
}

interface McpTool {
  name: string;
  description: string;
  descriptionEn: string;
  parameters: McpToolParam[];
  testable: boolean;
  requiredPermission: McpPermission;
  available?: boolean; // 現在のキーで利用可能かどうか
}

const translations = {
  en: {
    searchPlaceholder: "Search users...",
    search: "Search",
    newUser: "New User",
    noUsers: "No users found",
    userId: "User ID",
    displayName: "Display Name",
    email: "Email",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    resetPassword: "Reset",
    createUser: "Create User",
    editUser: "Edit User",
    password: "Password",
    passwordPlaceholder: "Enter password (leave blank to keep current)",
    save: "Save",
    cancel: "Cancel",
    deleteConfirm: "Delete User",
    deleteMessage: "Are you sure you want to delete this user?",
    loading: "Loading...",
    connectionError:
      "Cannot connect to LDAP server. Please check if the OpenLDAP container is running.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    total: "Total",
    serverStatus: "Server Status",
    connected: "Connected",
    disconnected: "Disconnected",
    checkConnection: "Check Connection",
    migrationTitle: "LDAP Migration",
    migrationDesc: "Migrate users from an existing LDAP server to OpenLDAP",
    // Migration Tab
    migrationPeriod: "Migration Period",
    migrationPeriodDesc:
      "Configure the migration period for fallback authentication",
    migrationEnabled: "Enable Migration Mode",
    migrationEnabledDesc:
      "When enabled, users not found in OpenLDAP will be authenticated against legacy LDAP and automatically migrated",
    startDate: "Start Date",
    endDate: "End Date",
    periodStatus: "Period Status",
    statusBefore: "Not Started",
    statusActive: "Active",
    statusAfter: "Ended",
    statusNotConfigured: "Not Configured",
    migrationStats: "Migration Statistics",
    totalUsers: "Total Users",
    migratedUsers: "Migrated Users",
    pendingUsers: "Pending Users",
    migrationProgress: "Progress",
    legacyLdapSettings: "Legacy LDAP Settings",
    legacyLdapDesc: "Configure the legacy LDAP server for migration",
    serverUrl: "Server URL",
    baseDN: "Base DN",
    bindDN: "Bind DN",
    bindPassword: "Bind Password",
    searchFilter: "Search Filter",
    saveSettings: "Save Settings",
    connectionSuccess: "Connection successful",
    connectionFailed: "Connection failed",
    settingsSaved: "Settings saved successfully",
    timeout: "Timeout (ms)",
    enabled: "Enabled",
    testUser: "Test User",
    testUserDesc: "Test connection with a user account",
    testUsername: "Username",
    testPasswordLabel: "Password",
    ldapAttributes: "LDAP Attributes",
    resetPasswordTitle: "Reset Password",
    resetPasswordMessage: "Reset password for this user?",
    newPassword: "New Password",
    generatePassword: "Generate Random",
    resetPasswordSuccess: "Password has been reset successfully.",
    copyPassword: "Copy",
    copied: "Copied!",
    passwordNotice: "Please save this password. It will not be shown again.",
    reset: "Reset",
    // Access Keys
    accessKeysTitle: "MCP Access Keys",
    accessKeysDesc: "Manage access keys for MCP server authentication",
    newAccessKey: "New Access Key",
    noAccessKeys: "No access keys found",
    keyName: "Name",
    accessKey: "Access Key",
    createdAt: "Created",
    lastUsedAt: "Last Used",
    expiresAt: "Expires",
    never: "Never",
    revoke: "Revoke",
    createAccessKey: "Create Access Key",
    keyNamePlaceholder: "Enter a name for this key",
    expirationLabel: "Expiration",
    noExpiration: "No expiration",
    days30: "30 days",
    days90: "90 days",
    days365: "1 year",
    create: "Create",
    accessKeyCreated: "Access key created successfully",
    accessKeyNotice:
      "Please copy this access key now. You won't be able to see it again!",
    revokeConfirm: "Revoke Access Key",
    revokeMessage:
      "Are you sure you want to revoke this access key? This action cannot be undone.",
    // Permission
    permission: "Permission",
    permissionLabel: "Access Level",
    readOnly: "Read Only",
    fullAccess: "Full Access",
    readOnlyDesc: "Can only read data (list users, search, get details)",
    fullAccessDesc: "Full access including create, update, delete operations",
    // MCP Test
    test: "Test",
    mcpTestTitle: "MCP Server Test",
    mcpTestDesc: "Test the MCP server connection and available tools",
    availableTools: "Available Tools",
    toolName: "Tool Name",
    toolDescription: "Description",
    testConnection: "Test Connection",
    testTool: "Test Tool",
    enterAccessKey: "Enter Access Key",
    accessKeyPlaceholder: "Paste the full access key here",
    testResult: "Test Result",
    selectTool: "Select a tool to test",
    runTest: "Run Test",
    noParameters: "No parameters required",
    parameters: "Parameters",
    toolTestSuccess: "Tool executed successfully",
    toolTestError: "Tool execution failed",
    close: "Close",
    keyPermission: "Permission",
    toolUnavailable: "Not available with current permission",
    requiredPermission: "Required",
    validating: "Validating...",
    keyValidated: "Access key is valid",
    validate: "Validate",
    notTestable: "Not testable (data modification operation)",
    // OpenLDAP Settings
    openLdapSettingsTitle: "OpenLDAP Settings",
    openLdapSettingsDesc: "Configure the OpenLDAP server connection",
    openLdapServerUrl: "Server URL",
    openLdapAdminDN: "Admin DN",
    openLdapAdminPassword: "Admin Password",
    openLdapBaseDN: "Base DN",
    openLdapUsersOU: "Users OU",
    openLdapTimeout: "Timeout (ms)",
    openLdapEnabled: "Enabled",
    openLdapTestConnection: "Test Connection",
    openLdapSaveSettings: "Save Settings",
    openLdapConnectionSuccess: "Connection to OpenLDAP server successful",
    openLdapConnectionFailed: "Failed to connect to OpenLDAP server",
    openLdapSettingsSaved: "OpenLDAP settings saved successfully",
    openLdapPasswordPlaceholder:
      "Enter new password (leave blank to keep current)",
  },
  ja: {
    searchPlaceholder: "ユーザを検索...",
    search: "検索",
    newUser: "新規ユーザ",
    noUsers: "ユーザが見つかりません",
    userId: "ユーザID",
    displayName: "表示名",
    email: "メール",
    actions: "操作",
    edit: "編集",
    delete: "削除",
    resetPassword: "リセット",
    createUser: "ユーザ作成",
    editUser: "ユーザ編集",
    password: "パスワード",
    passwordPlaceholder: "パスワードを入力（現在のまま変更しない場合は空白）",
    save: "保存",
    cancel: "キャンセル",
    deleteConfirm: "ユーザ削除",
    deleteMessage: "このユーザを削除してもよろしいですか？",
    loading: "読み込み中...",
    connectionError:
      "LDAPサーバに接続できません。OpenLDAPコンテナが起動しているか確認してください。",
    previous: "前へ",
    next: "次へ",
    page: "ページ",
    of: "/",
    total: "合計",
    serverStatus: "サーバ状態",
    connected: "接続済み",
    disconnected: "未接続",
    checkConnection: "接続確認",
    migrationTitle: "LDAP移行",
    migrationDesc: "既存のLDAPサーバからOpenLDAPへユーザを移行します",
    // Migration Tab
    migrationPeriod: "移行期間",
    migrationPeriodDesc: "フォールバック認証の移行期間を設定します",
    migrationEnabled: "移行モードを有効化",
    migrationEnabledDesc:
      "有効時、OpenLDAPに見つからないユーザは旧LDAPで認証され、自動的に移行されます",
    startDate: "開始日",
    endDate: "終了日",
    periodStatus: "期間状態",
    statusBefore: "開始前",
    statusActive: "有効",
    statusAfter: "終了",
    statusNotConfigured: "未設定",
    migrationStats: "移行統計",
    totalUsers: "全ユーザ数",
    migratedUsers: "移行済み",
    pendingUsers: "未移行",
    migrationProgress: "進捗",
    legacyLdapSettings: "旧LDAP設定",
    legacyLdapDesc: "移行元の旧LDAPサーバを設定します",
    serverUrl: "サーバURL",
    baseDN: "ベースDN",
    bindDN: "バインドDN",
    bindPassword: "バインドパスワード",
    searchFilter: "検索フィルタ",
    saveSettings: "設定を保存",
    connectionSuccess: "接続に成功しました",
    connectionFailed: "接続に失敗しました",
    settingsSaved: "設定を保存しました",
    timeout: "タイムアウト（ミリ秒）",
    enabled: "有効",
    testUser: "テストユーザ",
    testUserDesc: "ユーザアカウントで接続をテストします",
    testUsername: "ユーザ名",
    testPasswordLabel: "パスワード",
    ldapAttributes: "LDAP属性",
    resetPasswordTitle: "パスワードリセット",
    resetPasswordMessage: "このユーザのパスワードをリセットしますか？",
    newPassword: "新しいパスワード",
    generatePassword: "ランダム生成",
    resetPasswordSuccess: "パスワードがリセットされました。",
    copyPassword: "コピー",
    copied: "コピーしました！",
    passwordNotice: "このパスワードを保存してください。再表示はできません。",
    reset: "リセット",
    // Access Keys
    accessKeysTitle: "MCPアクセスキー",
    accessKeysDesc: "MCPサーバ認証用のアクセスキーを管理します",
    newAccessKey: "新規アクセスキー",
    noAccessKeys: "アクセスキーがありません",
    keyName: "名前",
    accessKey: "アクセスキー",
    createdAt: "作成日",
    lastUsedAt: "最終使用",
    expiresAt: "有効期限",
    never: "なし",
    revoke: "取消",
    createAccessKey: "アクセスキー作成",
    keyNamePlaceholder: "キーの名前を入力",
    expirationLabel: "有効期限",
    noExpiration: "無期限",
    days30: "30日",
    days90: "90日",
    days365: "1年",
    create: "作成",
    accessKeyCreated: "アクセスキーを作成しました",
    accessKeyNotice:
      "このアクセスキーを今すぐコピーしてください。再表示はできません！",
    revokeConfirm: "アクセスキー取消",
    revokeMessage:
      "このアクセスキーを取り消してもよろしいですか？この操作は元に戻せません。",
    // Permission
    permission: "権限",
    permissionLabel: "アクセスレベル",
    readOnly: "読み取り専用",
    fullAccess: "フルアクセス",
    readOnlyDesc: "データの読み取りのみ（一覧、検索、詳細取得）",
    fullAccessDesc: "作成、更新、削除を含むフルアクセス",
    // MCP Test
    test: "テスト",
    mcpTestTitle: "MCPサーバテスト",
    mcpTestDesc: "MCPサーバの接続と利用可能なツールをテストします",
    availableTools: "利用可能なツール",
    toolName: "ツール名",
    toolDescription: "説明",
    testConnection: "接続テスト",
    testTool: "ツールテスト",
    enterAccessKey: "アクセスキー入力",
    accessKeyPlaceholder: "アクセスキーを貼り付けてください",
    testResult: "テスト結果",
    selectTool: "テストするツールを選択してください",
    runTest: "テスト実行",
    noParameters: "パラメータ不要",
    parameters: "パラメータ",
    toolTestSuccess: "ツールが正常に実行されました",
    toolTestError: "ツールの実行に失敗しました",
    close: "閉じる",
    validating: "検証中...",
    keyValidated: "アクセスキーが有効です",
    keyInvalid: "無効なアクセスキーです",
    validate: "検証",
    testableOnly: "テスト可能なツールのみ表示（読み取り専用操作）",
    notTestable: "テスト不可（データ変更操作）",
    keyPermission: "権限",
    toolUnavailable: "現在の権限では利用不可",
    requiredPermission: "必要な権限",
    // OpenLDAP Settings
    openLdapSettingsTitle: "OpenLDAP設定",
    openLdapSettingsDesc: "OpenLDAPサーバへの接続を設定します",
    openLdapServerUrl: "サーバURL",
    openLdapAdminDN: "管理者DN",
    openLdapAdminPassword: "管理者パスワード",
    openLdapBaseDN: "ベースDN",
    openLdapUsersOU: "ユーザOU",
    openLdapTimeout: "タイムアウト（ミリ秒）",
    openLdapEnabled: "有効",
    openLdapTestConnection: "接続テスト",
    openLdapSaveSettings: "設定を保存",
    openLdapConnectionSuccess: "OpenLDAPサーバへの接続に成功しました",
    openLdapConnectionFailed: "OpenLDAPサーバへの接続に失敗しました",
    openLdapSettingsSaved: "OpenLDAP設定を保存しました",
    openLdapPasswordPlaceholder:
      "新しいパスワードを入力（現在のまま変更しない場合は空白）",
  },
};

export function OpenLdapManagementClient({
  language,
  tab,
}: OpenLdapManagementClientProps) {
  const t = translations[language];
  const { open } = useSidebar();
  const { width } = useSidebarStore();

  // ユーザ管理用
  const [users, setUsers] = useState<LdapUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // モーダル用
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LdapUser | null>(null);
  const [formData, setFormData] = useState({
    uid: "",
    password: "",
    displayName: "",
    mail: "",
  });
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // パスワードリセット用
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // アクセスキー管理用
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>([]);
  const [accessKeysLoading, setAccessKeysLoading] = useState(false);
  const [showAccessKeyModal, setShowAccessKeyModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedAccessKey, setSelectedAccessKey] = useState<AccessKey | null>(
    null,
  );
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiration, setNewKeyExpiration] = useState<
    "none" | "30" | "90" | "365"
  >("none");
  const [newKeyPermission, setNewKeyPermission] =
    useState<McpPermission>("READ_ONLY");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState(false);
  const [accessKeyCopied, setAccessKeyCopied] = useState(false);

  // MCPテスト用
  const [showTestModal, setShowTestModal] = useState(false);
  const [testAccessKey, setTestAccessKey] = useState("");
  const [testKeyValidated, setTestKeyValidated] = useState(false);
  const [testKeyName, setTestKeyName] = useState("");
  const [testKeyPermission, setTestKeyPermission] =
    useState<McpPermission | null>(null);
  const [testTools, setTestTools] = useState<McpTool[]>([]);
  const [validatingKey, setValidatingKey] = useState(false);
  const [selectedTestTool, setSelectedTestTool] = useState<McpTool | null>(
    null,
  );
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    result?: string;
    error?: string;
  } | null>(null);
  const [runningTest, setRunningTest] = useState(false);

  // 移行タブ用
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationSaving, setMigrationSaving] = useState(false);
  const [migrationConfig, setMigrationConfig] = useState({
    enabled: false,
    startDate: "",
    endDate: "",
  });
  const [migrationStats, setMigrationStats] = useState({
    totalUsers: 0,
    migratedUsers: 0,
    pendingUsers: 0,
    migrationPercentage: 0,
  });
  const [periodStatus, setPeriodStatus] = useState<
    "before" | "active" | "after" | "not_configured"
  >("not_configured");
  const [_legacyLdapConfig, setLegacyLdapConfig] = useState<{
    serverUrl: string;
    baseDN: string;
    bindDN: string;
    bindPassword: string;
    searchFilter: string;
    timeout: number;
    isEnabled: boolean;
  } | null>(null);
  const [legacyLdapForm, setLegacyLdapForm] = useState({
    serverUrl: "",
    baseDN: "",
    bindDN: "",
    bindPassword: "",
    searchFilter: "(uid={username})",
    timeout: 10000,
    isEnabled: false,
  });
  const [legacyLdapSaving, setLegacyLdapSaving] = useState(false);
  const [legacyLdapTesting, setLegacyLdapTesting] = useState(false);
  const [legacyTestUsername, setLegacyTestUsername] = useState("");
  const [legacyTestPassword, setLegacyTestPassword] = useState("");
  const [legacyLdapTestResult, setLegacyLdapTestResult] = useState<{
    success: boolean;
    message: string;
    attributes?: Record<string, string>;
  } | null>(null);

  // OpenLDAP設定タブ用
  const [openLdapSettingsLoading, setOpenLdapSettingsLoading] = useState(false);
  const [openLdapSettingsSaving, setOpenLdapSettingsSaving] = useState(false);
  const [openLdapSettingsTesting, setOpenLdapSettingsTesting] = useState(false);
  const [openLdapSettingsForm, setOpenLdapSettingsForm] = useState({
    isEnabled: true,
    serverUrl: "",
    adminDN: "",
    adminPassword: "",
    baseDN: "",
    usersOU: "",
    timeout: 10000,
  });
  const [openLdapHasPassword, setOpenLdapHasPassword] = useState(false);
  const [openLdapSettingsTestResult, setOpenLdapSettingsTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  // ユーザ一覧取得
  const fetchUsers = useCallback(async () => {
    console.log("🔍 [fetchUsers] Called with:", {
      tab,
      page,
      pageSize,
      searchQuery,
    });
    if (tab !== "users") {
      console.log("⏭️ [fetchUsers] Skipping - tab is not 'users':", tab);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const url = `/api/admin/ldap-users?${params}`;
      console.log("📡 [fetchUsers] Fetching from:", url);
      const response = await fetch(url);
      console.log(
        "📥 [fetchUsers] Response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("❌ [fetchUsers] Error response:", data);
        if (response.status === 503 || data.error?.includes("ECONNREFUSED")) {
          setIsConnected(false);
          throw new Error(t.connectionError);
        }
        throw new Error(data.errorJa || data.error || "Failed to fetch users");
      }

      const data = await response.json();
      console.log("✅ [fetchUsers] Success! Data:", data);
      console.log("👥 [fetchUsers] Users array:", data.users);
      console.log("📊 [fetchUsers] Total:", data.total);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setIsConnected(true);
    } catch (error) {
      console.error("❌ [fetchUsers] Exception:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
      console.log("🏁 [fetchUsers] Completed");
    }
  }, [tab, page, pageSize, searchQuery, t.connectionError]);

  // 接続確認
  const _checkConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/ldap-users?page=1&pageSize=1");
      setIsConnected(response.ok);
      if (response.ok) {
        fetchUsers();
      }
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // ユーザタブが選択されたらユーザ一覧を取得
  useEffect(() => {
    if (tab === "users") {
      fetchUsers();
    }
  }, [tab, fetchUsers]);

  // 検索実行
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // ユーザ作成/編集モーダルを開く
  const openUserModal = (user?: LdapUser) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        uid: user.uid,
        password: "",
        displayName: user.displayName || "",
        mail: user.mail || "",
      });
    } else {
      setSelectedUser(null);
      setFormData({
        uid: "",
        password: "",
        displayName: "",
        mail: "",
      });
    }
    setShowUserModal(true);
  };

  // ユーザ保存
  const handleSaveUser = async () => {
    try {
      setFormSaving(true);
      setMessage("");

      if (selectedUser) {
        // 編集
        const response = await fetch(
          `/api/admin/ldap-users/${selectedUser.uid}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: formData.displayName || undefined,
              mail: formData.mail || undefined,
              password: formData.password || undefined,
            }),
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.errorJa || data.error || "Failed to update user",
          );
        }
      } else {
        // 新規作成
        if (!formData.uid || !formData.password) {
          setMessage(
            language === "ja"
              ? "ユーザIDとパスワードは必須です"
              : "User ID and password are required",
          );
          return;
        }

        const response = await fetch("/api/admin/ldap-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.errorJa || data.error || "Failed to create user",
          );
        }
      }

      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setFormSaving(false);
    }
  };

  // 削除確認モーダルを開く
  const openDeleteModal = (user: LdapUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // ユーザ削除
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/ldap-users/${selectedUser.uid}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errorJa || data.error || "Failed to delete user");
      }

      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setDeleting(false);
    }
  };

  // ランダムパスワード生成
  const generateRandomPassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPassword(password);
  };

  // パスワードリセットモーダルを開く
  const openResetPasswordModal = (user: LdapUser) => {
    setSelectedUser(user);
    setResetPassword("");
    setResetSuccess(false);
    setCopied(false);
    setShowResetPasswordModal(true);
  };

  // パスワードリセット実行
  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;

    try {
      setResetting(true);
      const response = await fetch(
        `/api/admin/ldap-users/${selectedUser.uid}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: resetPassword }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.errorJa || data.error || "Failed to reset password",
        );
      }

      setResetSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
      setShowResetPasswordModal(false);
    } finally {
      setResetting(false);
    }
  };

  // パスワードをクリップボードにコピー
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resetPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // アクセスキー一覧取得
  const fetchAccessKeys = useCallback(async () => {
    if (tab !== "accesskeys") return;

    try {
      setAccessKeysLoading(true);
      const response = await fetch("/api/admin/mcp-access-keys");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.errorJa || data.error || "Failed to fetch access keys",
        );
      }
      const data = await response.json();
      setAccessKeys(data.keys || []);
    } catch (error) {
      console.error("Error fetching access keys:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setAccessKeysLoading(false);
    }
  }, [tab]);

  // アクセスキータブが選択されたらキー一覧を取得
  useEffect(() => {
    if (tab === "accesskeys") {
      fetchAccessKeys();
    }
  }, [tab, fetchAccessKeys]);

  // 移行データ取得
  const fetchMigrationData = useCallback(async () => {
    if (tab !== "migration") return;

    try {
      setMigrationLoading(true);
      const response = await fetch("/api/admin/ldap-migration");
      if (!response.ok) {
        throw new Error("Failed to fetch migration data");
      }
      const data = await response.json();
      setMigrationConfig({
        enabled: data.config.enabled,
        startDate: data.config.startDate || "",
        endDate: data.config.endDate || "",
      });
      setMigrationStats(data.stats);
      setPeriodStatus(data.periodStatus);
      setLegacyLdapConfig(data.legacyLdapConfig);
      // フォームを既存データで初期化
      if (data.legacyLdapConfig) {
        setLegacyLdapForm({
          serverUrl: data.legacyLdapConfig.serverUrl || "",
          baseDN: data.legacyLdapConfig.baseDN || "",
          bindDN: data.legacyLdapConfig.bindDN || "",
          bindPassword: data.legacyLdapConfig.bindPassword || "",
          searchFilter:
            data.legacyLdapConfig.searchFilter || "(uid={username})",
          timeout: data.legacyLdapConfig.timeout || 10000,
          isEnabled: data.legacyLdapConfig.isEnabled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching migration data:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setMigrationLoading(false);
    }
  }, [tab]);

  // 移行タブが選択されたらデータを取得
  useEffect(() => {
    if (tab === "migration") {
      fetchMigrationData();
    }
  }, [tab, fetchMigrationData]);

  // 旧LDAP設定保存
  const handleSaveLegacyLdapConfig = async () => {
    try {
      setLegacyLdapSaving(true);
      const response = await fetch("/api/admin/ldap-migration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyLdapForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save legacy LDAP config");
      }

      setMessage(t.settingsSaved);
      fetchMigrationData();
    } catch (error) {
      console.error("Error saving legacy LDAP config:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLegacyLdapSaving(false);
    }
  };

  // 旧LDAP接続テスト
  const handleTestLegacyLdap = async () => {
    if (!legacyTestUsername || !legacyTestPassword) {
      setLegacyLdapTestResult({
        success: false,
        message:
          language === "ja"
            ? "ユーザ名とパスワードを入力してください"
            : "Please enter username and password",
      });
      return;
    }

    try {
      setLegacyLdapTesting(true);
      setLegacyLdapTestResult(null);

      const response = await fetch("/api/admin/ldap-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: legacyTestUsername,
          password: legacyTestPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLegacyLdapTestResult({
          success: true,
          message: t.connectionSuccess,
          attributes: data.attributes,
        });
      } else {
        setLegacyLdapTestResult({
          success: false,
          message: data.error || t.connectionFailed,
        });
      }
    } catch (error) {
      console.error("Error testing legacy LDAP:", error);
      setLegacyLdapTestResult({
        success: false,
        message: error instanceof Error ? error.message : t.connectionFailed,
      });
    } finally {
      setLegacyLdapTesting(false);
    }
  };

  // 移行設定保存
  const handleSaveMigrationConfig = async () => {
    try {
      setMigrationSaving(true);
      const response = await fetch("/api/admin/ldap-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(migrationConfig),
      });

      if (!response.ok) {
        throw new Error("Failed to save migration config");
      }

      setMessage(t.settingsSaved);
      fetchMigrationData();
    } catch (error) {
      console.error("Error saving migration config:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setMigrationSaving(false);
    }
  };

  // OpenLDAP設定取得
  const fetchOpenLdapSettings = useCallback(async () => {
    if (tab !== "settings") return;

    try {
      setOpenLdapSettingsLoading(true);
      const response = await fetch("/api/admin/openldap-config");
      if (!response.ok) {
        throw new Error("Failed to fetch OpenLDAP settings");
      }
      const data = await response.json();
      setOpenLdapSettingsForm({
        isEnabled: data.isEnabled,
        serverUrl: data.serverUrl || "",
        adminDN: data.adminDN || "",
        adminPassword: "", // パスワードは表示しない
        baseDN: data.baseDN || "",
        usersOU: data.usersOU || "",
        timeout: data.timeout || 10000,
      });
      setOpenLdapHasPassword(data.hasPassword);
    } catch (error) {
      console.error("Error fetching OpenLDAP settings:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setOpenLdapSettingsLoading(false);
    }
  }, [tab]);

  // 設定タブが選択されたらデータを取得
  useEffect(() => {
    if (tab === "settings") {
      fetchOpenLdapSettings();
    }
  }, [tab, fetchOpenLdapSettings]);

  // OpenLDAP設定保存
  const handleSaveOpenLdapSettings = async () => {
    try {
      setOpenLdapSettingsSaving(true);
      const response = await fetch("/api/admin/openldap-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openLdapSettingsForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save OpenLDAP settings");
      }

      setMessage(t.openLdapSettingsSaved);
      setOpenLdapSettingsTestResult(null);
      fetchOpenLdapSettings();
    } catch (error) {
      console.error("Error saving OpenLDAP settings:", error);
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setOpenLdapSettingsSaving(false);
    }
  };

  // OpenLDAP接続テスト
  const handleTestOpenLdapConnection = async () => {
    try {
      setOpenLdapSettingsTesting(true);
      setOpenLdapSettingsTestResult(null);

      // まず設定を保存
      const saveResponse = await fetch("/api/admin/openldap-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openLdapSettingsForm),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save OpenLDAP settings");
      }

      // 接続テスト
      const response = await fetch("/api/admin/openldap/status");
      if (!response.ok) {
        throw new Error("Failed to test OpenLDAP connection");
      }

      const data = await response.json();
      setOpenLdapSettingsTestResult({
        success: data.isAvailable,
        message: data.isAvailable
          ? t.openLdapConnectionSuccess
          : t.openLdapConnectionFailed,
      });
    } catch (error) {
      console.error("Error testing OpenLDAP connection:", error);
      setOpenLdapSettingsTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : t.openLdapConnectionFailed,
      });
    } finally {
      setOpenLdapSettingsTesting(false);
    }
  };

  // アクセスキー作成モーダルを開く
  const openAccessKeyModal = () => {
    setNewKeyName("");
    setNewKeyExpiration("none");
    setNewKeyPermission("READ_ONLY");
    setNewlyCreatedKey(null);
    setShowAccessKeyModal(true);
  };

  // アクセスキー作成
  const handleCreateAccessKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      setCreatingKey(true);
      const response = await fetch("/api/admin/mcp-access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays:
            newKeyExpiration === "none" ? null : parseInt(newKeyExpiration, 10),
          permission: newKeyPermission,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.errorJa || data.error || "Failed to create access key",
        );
      }

      const data = await response.json();
      setNewlyCreatedKey(data.key);
      fetchAccessKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
      setShowAccessKeyModal(false);
    } finally {
      setCreatingKey(false);
    }
  };

  // アクセスキー取消確認モーダルを開く
  const openRevokeModal = (key: AccessKey) => {
    setSelectedAccessKey(key);
    setShowRevokeModal(true);
  };

  // アクセスキー取消
  const handleRevokeAccessKey = async () => {
    if (!selectedAccessKey) return;

    try {
      setRevokingKey(true);
      const response = await fetch(
        `/api/admin/mcp-access-keys/${selectedAccessKey.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.errorJa || data.error || "Failed to revoke access key",
        );
      }

      setShowRevokeModal(false);
      fetchAccessKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setRevokingKey(false);
    }
  };

  // アクセスキーをクリップボードにコピー
  const copyAccessKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setAccessKeyCopied(true);
      setTimeout(() => setAccessKeyCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.never;
    return new Date(dateString).toLocaleDateString(
      language === "ja" ? "ja-JP" : "en-US",
    );
  };

  // テストモーダルを開く
  const openTestModal = (key?: AccessKey) => {
    setTestAccessKey(key ? "" : ""); // 作成直後のキーは引数で渡されない
    setTestKeyValidated(false);
    setTestKeyName("");
    setTestTools([]);
    setSelectedTestTool(null);
    setTestParams({});
    setTestResult(null);
    setShowTestModal(true);
  };

  // アクセスキーを検証
  const validateAccessKey = async () => {
    if (!testAccessKey.trim()) return;

    try {
      setValidatingKey(true);
      setTestResult(null);
      const response = await fetch("/api/admin/mcp-access-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: testAccessKey, action: "validate" }),
      });

      const data = await response.json();
      if (!response.ok) {
        setTestResult({ success: false, error: data.errorJa || data.error });
        setTestKeyValidated(false);
        return;
      }

      setTestKeyValidated(true);
      setTestKeyName(data.keyName);
      setTestKeyPermission(data.permission || null);
      setTestTools(data.tools || []);
    } catch (error) {
      console.error("Error validating key:", error);
      setTestResult({
        success: false,
        error: language === "ja" ? "検証に失敗しました" : "Validation failed",
      });
    } finally {
      setValidatingKey(false);
    }
  };

  // ツールを選択
  const selectTool = (tool: McpTool) => {
    setSelectedTestTool(tool);
    setTestParams({});
    setTestResult(null);
  };

  // ツールテスト実行
  const runToolTest = async () => {
    if (!selectedTestTool || !testAccessKey) return;

    try {
      setRunningTest(true);
      setTestResult(null);
      const response = await fetch("/api/admin/mcp-access-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKey: testAccessKey,
          action: "test",
          toolName: selectedTestTool.name,
          parameters: testParams,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setTestResult({ success: false, error: data.errorJa || data.error });
        return;
      }

      setTestResult(data);
    } catch (error) {
      console.error("Error running test:", error);
      setTestResult({
        success: false,
        error: language === "ja" ? "テストに失敗しました" : "Test failed",
      });
    } finally {
      setRunningTest(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{ top: "6rem", left: open ? `${width}px` : "4rem" }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* メッセージ */}
          {message && (
            <div
              className={`p-3 rounded ${message.includes("Error") || message.includes("失敗") || message.includes("できません") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
            >
              {message}
            </div>
          )}

          {/* ユーザタブ */}
          {tab === "users" && (
            <Card>
              <CardContent className="p-6">
                {/* ツールバー：検索と新規作成 */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="pl-9 w-full sm:w-72"
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      {t.search}
                    </Button>
                  </form>
                  <Button
                    onClick={() => openUserModal()}
                    disabled={!isConnected}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t.newUser}
                  </Button>
                </div>

                {/* データテーブル */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t.noUsers}</p>
                  </div>
                ) : (
                  <>
                    {/* ページネーション（テーブル上部） */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {t.total}: <span className="font-medium text-foreground">{total}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t.previous}
                        </Button>
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-sm font-medium">{page}</span>
                          <span className="text-sm text-muted-foreground">/</span>
                          <span className="text-sm text-muted-foreground">{totalPages || 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          className="gap-1"
                        >
                          {t.next}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">{t.userId}</TableHead>
                            <TableHead className="font-semibold">{t.displayName}</TableHead>
                            <TableHead className="font-semibold">{t.email}</TableHead>
                            <TableHead className="text-right font-semibold">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.uid}>
                              <TableCell className="font-medium">{user.uid}</TableCell>
                              <TableCell>{user.displayName || user.cn}</TableCell>
                              <TableCell className="text-muted-foreground">{user.mail || "-"}</TableCell>
                              <TableCell className="text-right">
                                <TooltipProvider>
                                  <div className="flex justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => openUserModal(user)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t.edit}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                          onClick={() => openResetPasswordModal(user)}
                                        >
                                          <KeyRound className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t.resetPassword}</p>
                                      </TooltipContent>
                                    </Tooltip>
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
                                        <p>{t.delete}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* アクセスキータブ */}
          {tab === "accesskeys" && (
            <Card>
              <CardContent className="p-6">
                {/* ツールバー */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex-1" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openTestModal()}
                    >
                      {t.test}
                    </Button>
                    <Button onClick={openAccessKeyModal}>
                      {t.newAccessKey}
                    </Button>
                  </div>
                </div>

                {accessKeysLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : accessKeys.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.noAccessKeys}
                  </div>
                ) : (
                  <>
                    {/* 合計表示 */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {t.total}: <span className="font-medium text-foreground">{accessKeys.length}</span>
                      </p>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>{t.keyName}</TableHead>
                            <TableHead>{t.accessKey}</TableHead>
                            <TableHead>{t.permission}</TableHead>
                            <TableHead>{t.createdAt}</TableHead>
                            <TableHead>{t.lastUsedAt}</TableHead>
                            <TableHead>{t.expiresAt}</TableHead>
                            <TableHead className="text-right">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accessKeys.map((key) => (
                            <TableRow key={key.id}>
                              <TableCell className="font-medium">{key.name}</TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    key.permission === "FULL_ACCESS"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {key.permission === "FULL_ACCESS" ? t.fullAccess : t.readOnly}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(key.createdAt)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(key.lastUsedAt)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(key.expiresAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => openRevokeModal(key)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t.revoke}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 移行タブ */}
          {tab === "migration" && (
            <Card>
              <CardContent className="p-6 space-y-6">
          {/* タイトル */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              {t.migrationTitle}
            </h2>
            <p className="text-muted-foreground">{t.migrationDesc}</p>
          </div>

          {migrationLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
          ) : (
            <>
              {/* 移行統計 */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-md font-medium text-foreground mb-4">
                  {t.migrationStats}
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">
                      {migrationStats.totalUsers}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.totalUsers}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {migrationStats.migratedUsers}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.migratedUsers}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">
                      {migrationStats.pendingUsers}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.pendingUsers}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {migrationStats.migrationPercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.migrationProgress}
                    </p>
                  </div>
                </div>
                {/* プログレスバー */}
                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${migrationStats.migrationPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 移行期間設定 */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-md font-medium text-foreground mb-2">
                  {t.migrationPeriod}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.migrationPeriodDesc}
                </p>

                <div className="space-y-4">
                  {/* 有効/無効トグル */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {t.migrationEnabled}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.migrationEnabledDesc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMigrationConfig({
                          ...migrationConfig,
                          enabled: !migrationConfig.enabled,
                        })
                      }
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                          migrationConfig.enabled
                            ? "bg-teal-600"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                            migrationConfig.enabled
                              ? "translate-x-7"
                              : "translate-x-1"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          migrationConfig.enabled
                            ? "text-teal-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {migrationConfig.enabled ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {/* 期間設定 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.startDate}
                      </label>
                      <input
                        type="date"
                        value={migrationConfig.startDate}
                        onChange={(e) =>
                          setMigrationConfig({
                            ...migrationConfig,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.endDate}
                      </label>
                      <input
                        type="date"
                        value={migrationConfig.endDate}
                        onChange={(e) =>
                          setMigrationConfig({
                            ...migrationConfig,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>

                  {/* 期間状態表示 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t.periodStatus}:
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        periodStatus === "active"
                          ? "bg-green-100 text-green-800"
                          : periodStatus === "before"
                            ? "bg-blue-100 text-blue-800"
                            : periodStatus === "after"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {periodStatus === "active"
                        ? t.statusActive
                        : periodStatus === "before"
                          ? t.statusBefore
                          : periodStatus === "after"
                            ? t.statusAfter
                            : t.statusNotConfigured}
                    </span>
                  </div>

                  {/* 保存ボタン */}
                  <div className="flex justify-end pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveMigrationConfig}
                      disabled={migrationSaving}
                    >
                      {migrationSaving ? t.loading : t.saveSettings}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 旧LDAP設定（編集可能） */}
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-medium text-foreground">
                    {t.legacyLdapSettings}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setLegacyLdapForm({
                        ...legacyLdapForm,
                        isEnabled: !legacyLdapForm.isEnabled,
                      })
                    }
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                        legacyLdapForm.isEnabled ? "bg-teal-600" : "bg-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                          legacyLdapForm.isEnabled
                            ? "translate-x-7"
                            : "translate-x-1"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        legacyLdapForm.isEnabled
                          ? "text-teal-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {legacyLdapForm.isEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t.legacyLdapDesc}</p>

                <div className="space-y-4">
                  {/* サーバURL と ベースDN */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.serverUrl} *
                      </label>
                      <input
                        type="text"
                        value={legacyLdapForm.serverUrl}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            serverUrl: e.target.value,
                          })
                        }
                        placeholder="ldap://ldap.example.com:389"
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.baseDN} *
                      </label>
                      <input
                        type="text"
                        value={legacyLdapForm.baseDN}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            baseDN: e.target.value,
                          })
                        }
                        placeholder="ou=Users,dc=example,dc=com"
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>

                  {/* バインドDN と バインドパスワード */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.bindDN}
                      </label>
                      <input
                        type="text"
                        value={legacyLdapForm.bindDN}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            bindDN: e.target.value,
                          })
                        }
                        placeholder="cn=admin,dc=example,dc=com"
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.bindPassword}
                      </label>
                      <input
                        type="password"
                        value={legacyLdapForm.bindPassword}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            bindPassword: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>

                  {/* 検索フィルタ と タイムアウト */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.searchFilter}
                      </label>
                      <input
                        type="text"
                        value={legacyLdapForm.searchFilter}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            searchFilter: e.target.value,
                          })
                        }
                        placeholder="(uid={username})"
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.timeout}
                      </label>
                      <input
                        type="number"
                        value={legacyLdapForm.timeout}
                        onChange={(e) =>
                          setLegacyLdapForm({
                            ...legacyLdapForm,
                            timeout: parseInt(e.target.value, 10) || 10000,
                          })
                        }
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>

                  {/* 保存ボタン */}
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      onClick={handleSaveLegacyLdapConfig}
                      disabled={legacyLdapSaving}
                    >
                      {legacyLdapSaving ? t.loading : t.saveSettings}
                    </Button>
                  </div>
                </div>

                {/* 接続テスト */}
                <div className="mt-6 pt-6 border-t border">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {t.testUser}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">{t.testUserDesc}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.testUsername}
                      </label>
                      <input
                        type="text"
                        value={legacyTestUsername}
                        onChange={(e) => setLegacyTestUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {t.testPasswordLabel}
                      </label>
                      <input
                        type="password"
                        value={legacyTestPassword}
                        onChange={(e) => setLegacyTestPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={handleTestLegacyLdap}
                    disabled={legacyLdapTesting || !legacyLdapForm.serverUrl}
                  >
                    {legacyLdapTesting ? t.loading : t.runTest}
                  </Button>

                  {/* テスト結果 */}
                  {legacyLdapTestResult && (
                    <div
                      className={`mt-4 p-4 rounded-lg ${
                        legacyLdapTestResult.success
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <p
                        className={`font-medium ${
                          legacyLdapTestResult.success
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {legacyLdapTestResult.success ? "✓ " : "✗ "}
                        {legacyLdapTestResult.message}
                      </p>
                      {legacyLdapTestResult.attributes && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-foreground mb-1">
                            {t.ldapAttributes}:
                          </p>
                          <pre className="text-xs bg-muted p-2 rounded border overflow-auto max-h-32">
                            {JSON.stringify(
                              legacyLdapTestResult.attributes,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
              </CardContent>
            </Card>
          )}

          {/* 設定タブ */}
          {tab === "settings" && (
            <Card>
              <CardContent className="p-6 space-y-6">
          {/* タイトル */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              {t.openLdapSettingsTitle}
            </h2>
            <p className="text-muted-foreground">{t.openLdapSettingsDesc}</p>
          </div>

          {openLdapSettingsLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
          ) : (
            <div className="bg-card rounded-lg border p-6">
              <div className="space-y-4">
                {/* 有効/無効トグル */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {t.openLdapEnabled}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLdapSettingsForm({
                        ...openLdapSettingsForm,
                        isEnabled: !openLdapSettingsForm.isEnabled,
                      })
                    }
                    className="flex items-center gap-3"
                    aria-label={
                      openLdapSettingsForm.isEnabled
                        ? "OpenLDAPを無効化"
                        : "OpenLDAPを有効化"
                    }
                  >
                    {/* トグルスイッチ */}
                    <div
                      className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                        openLdapSettingsForm.isEnabled
                          ? "bg-teal-600"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                          openLdapSettingsForm.isEnabled
                            ? "translate-x-7"
                            : "translate-x-1"
                        }`}
                      />
                    </div>
                    {/* ON/OFFラベル */}
                    <span
                      className={`text-sm font-medium ${
                        openLdapSettingsForm.isEnabled
                          ? "text-teal-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {openLdapSettingsForm.isEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>

                {/* サーバURL */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.openLdapServerUrl}
                  </label>
                  <input
                    type="text"
                    value={openLdapSettingsForm.serverUrl}
                    onChange={(e) =>
                      setOpenLdapSettingsForm({
                        ...openLdapSettingsForm,
                        serverUrl: e.target.value,
                      })
                    }
                    placeholder="ldap://openldap:389"
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>

                {/* 管理者DN と パスワード */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t.openLdapAdminDN}
                    </label>
                    <input
                      type="text"
                      value={openLdapSettingsForm.adminDN}
                      onChange={(e) =>
                        setOpenLdapSettingsForm({
                          ...openLdapSettingsForm,
                          adminDN: e.target.value,
                        })
                      }
                      placeholder="cn=admin,dc=occ,dc=co,dc=jp"
                      className="w-full px-3 py-2 border border-input rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t.openLdapAdminPassword}
                      {openLdapHasPassword && (
                        <span className="text-muted-foreground text-xs ml-2">
                          (●●●●●●)
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={openLdapSettingsForm.adminPassword}
                      onChange={(e) =>
                        setOpenLdapSettingsForm({
                          ...openLdapSettingsForm,
                          adminPassword: e.target.value,
                        })
                      }
                      placeholder={t.openLdapPasswordPlaceholder}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    />
                  </div>
                </div>

                {/* ベースDN と ユーザOU */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t.openLdapBaseDN}
                    </label>
                    <input
                      type="text"
                      value={openLdapSettingsForm.baseDN}
                      onChange={(e) =>
                        setOpenLdapSettingsForm({
                          ...openLdapSettingsForm,
                          baseDN: e.target.value,
                        })
                      }
                      placeholder="dc=occ,dc=co,dc=jp"
                      className="w-full px-3 py-2 border border-input rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t.openLdapUsersOU}
                    </label>
                    <input
                      type="text"
                      value={openLdapSettingsForm.usersOU}
                      onChange={(e) =>
                        setOpenLdapSettingsForm({
                          ...openLdapSettingsForm,
                          usersOU: e.target.value,
                        })
                      }
                      placeholder="ou=Users,dc=occ,dc=co,dc=jp"
                      className="w-full px-3 py-2 border border-input rounded-md"
                    />
                  </div>
                </div>

                {/* タイムアウト */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.openLdapTimeout}
                  </label>
                  <input
                    type="number"
                    value={openLdapSettingsForm.timeout}
                    onChange={(e) =>
                      setOpenLdapSettingsForm({
                        ...openLdapSettingsForm,
                        timeout: parseInt(e.target.value, 10) || 10000,
                      })
                    }
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>

                {/* ボタン */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={handleTestOpenLdapConnection}
                    disabled={openLdapSettingsTesting}
                  >
                    {openLdapSettingsTesting
                      ? t.loading
                      : t.openLdapTestConnection}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveOpenLdapSettings}
                    disabled={openLdapSettingsSaving}
                  >
                    {openLdapSettingsSaving
                      ? t.loading
                      : t.openLdapSaveSettings}
                  </Button>
                </div>

                {/* テスト結果 */}
                {openLdapSettingsTestResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      openLdapSettingsTestResult.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        openLdapSettingsTestResult.success
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {openLdapSettingsTestResult.success ? "✓ " : "✗ "}
                      {openLdapSettingsTestResult.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ユーザ作成/編集モーダル */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{selectedUser ? t.editUser : t.createUser}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">{t.userId}</Label>
              <Input
                id="userId"
                value={formData.uid}
                onChange={(e) =>
                  setFormData({ ...formData, uid: e.target.value })
                }
                disabled={!!selectedUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={selectedUser ? t.passwordPlaceholder : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t.displayName}</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                value={formData.mail}
                onChange={(e) =>
                  setFormData({ ...formData, mail: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveUser} disabled={formSaving}>
              {formSaving ? t.loading : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認モーダル */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.deleteConfirm}</DialogTitle>
            <DialogDescription>{t.deleteMessage}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <p className="font-medium text-foreground">
              {selectedUser.uid} ({selectedUser.displayName || selectedUser.cn})
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? t.loading : t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* パスワードリセットモーダル */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.resetPasswordTitle}</DialogTitle>
            {selectedUser && (
              <DialogDescription>
                {t.resetPasswordMessage}
                <br />
                <span className="font-medium text-foreground">
                  {selectedUser.uid} ({selectedUser.displayName || selectedUser.cn})
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {t.resetPasswordSuccess}
              </div>
              <div className="space-y-2">
                <Label>{t.newPassword}</Label>
                <div className="flex gap-2">
                  <Input
                    value={resetPassword}
                    readOnly
                    className="flex-1 bg-muted font-mono"
                  />
                  <Button variant="outline" onClick={copyToClipboard}>
                    {copied ? t.copied : t.copyPassword}
                  </Button>
                </div>
                <p className="text-sm text-amber-600">{t.passwordNotice}</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowResetPasswordModal(false)}>
                  {t.cancel}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.newPassword}</Label>
                <div className="flex gap-2">
                  <Input
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 font-mono"
                    placeholder="********"
                  />
                  <Button variant="outline" onClick={generateRandomPassword}>
                    {t.generatePassword}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
                  {t.cancel}
                </Button>
                <Button
                  variant="secondary"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleResetPassword}
                  disabled={resetting || !resetPassword}
                >
                  {resetting ? t.loading : t.reset}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* アクセスキー作成モーダル */}
      <Dialog
        open={showAccessKeyModal}
        onOpenChange={(open) => {
          if (!open && !newlyCreatedKey) {
            setShowAccessKeyModal(false);
          } else if (!open && newlyCreatedKey) {
            setShowAccessKeyModal(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t.createAccessKey}</DialogTitle>
          </DialogHeader>
          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {t.accessKeyCreated}
              </div>
              <div className="space-y-2">
                <Label>{t.accessKey}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newlyCreatedKey}
                    readOnly
                    className="flex-1 bg-muted font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyAccessKey(newlyCreatedKey)}
                  >
                    {accessKeyCopied ? t.copied : t.copyPassword}
                  </Button>
                </div>
                <p className="text-sm text-amber-600">{t.accessKeyNotice}</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowAccessKeyModal(false)}>
                  {t.cancel}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.keyName}</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t.keyNamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.permissionLabel}</Label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="permission"
                      value="READ_ONLY"
                      checked={newKeyPermission === "READ_ONLY"}
                      onChange={(e) =>
                        setNewKeyPermission(e.target.value as McpPermission)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-sm">{t.readOnly}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.readOnlyDesc}
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="permission"
                      value="FULL_ACCESS"
                      checked={newKeyPermission === "FULL_ACCESS"}
                      onChange={(e) =>
                        setNewKeyPermission(e.target.value as McpPermission)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-sm">{t.fullAccess}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.fullAccessDesc}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.expirationLabel}</Label>
                <select
                  value={newKeyExpiration}
                  onChange={(e) =>
                    setNewKeyExpiration(
                      e.target.value as "none" | "30" | "90" | "365",
                    )
                  }
                  className="w-full h-10 px-3 py-2 border rounded-md bg-background"
                >
                  <option value="none">{t.noExpiration}</option>
                  <option value="30">{t.days30}</option>
                  <option value="90">{t.days90}</option>
                  <option value="365">{t.days365}</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAccessKeyModal(false)}>
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleCreateAccessKey}
                  disabled={creatingKey || !newKeyName.trim()}
                >
                  {creatingKey ? t.loading : t.create}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* アクセスキー取消確認モーダル */}
      <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.revokeConfirm}</DialogTitle>
            <DialogDescription>{t.revokeMessage}</DialogDescription>
          </DialogHeader>
          {selectedAccessKey && (
            <p className="font-medium text-foreground">{selectedAccessKey.name}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeModal(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAccessKey}
              disabled={revokingKey}
            >
              {revokingKey ? t.loading : t.revoke}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCPテストモーダル */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.mcpTestTitle}</DialogTitle>
            <DialogDescription>{t.mcpTestDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* アクセスキー入力 */}
            <div className="space-y-2">
              <Label>{t.enterAccessKey}</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={testAccessKey}
                  onChange={(e) => {
                    setTestAccessKey(e.target.value);
                    setTestKeyValidated(false);
                  }}
                  placeholder={t.accessKeyPlaceholder}
                  className="flex-1 font-mono text-sm"
                  disabled={testKeyValidated}
                />
                <Button
                  variant={testKeyValidated ? "outline" : "default"}
                  onClick={validateAccessKey}
                  disabled={
                    validatingKey || !testAccessKey.trim() || testKeyValidated
                  }
                >
                  {validatingKey
                    ? t.validating
                    : testKeyValidated
                      ? "✓"
                      : t.validate}
                </Button>
              </div>
              {testKeyValidated && (
                <div className="space-y-1">
                  <p className="text-sm text-green-600">
                    ✓ {t.keyValidated} ({testKeyName})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.keyPermission}:{" "}
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        testKeyPermission === "FULL_ACCESS"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {testKeyPermission === "FULL_ACCESS"
                        ? t.fullAccess
                        : t.readOnly}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* 検証結果エラー */}
            {testResult && !testResult.success && !testKeyValidated && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {testResult.error}
              </div>
            )}

            {/* ツール一覧（キー検証後に表示） */}
            {testKeyValidated && testTools.length > 0 && (
              <div className="space-y-2">
                <Label>{t.availableTools}</Label>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {testTools.map((tool) => {
                    const isAvailable = tool.available !== false;
                    const canTest = tool.testable && isAvailable;
                    return (
                      <button
                        key={tool.name}
                        type="button"
                        onClick={() => canTest && selectTool(tool)}
                        disabled={!canTest}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedTestTool?.name === tool.name
                            ? "bg-primary/10 border-l-4 border-primary"
                            : canTest
                              ? "hover:bg-muted/50"
                              : "opacity-50 cursor-not-allowed bg-muted/30"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p
                              className={`font-mono text-sm ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              {tool.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === "ja"
                                ? tool.description
                                : tool.descriptionEn}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {/* 権限バッジ */}
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                tool.requiredPermission === "FULL_ACCESS"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {tool.requiredPermission === "FULL_ACCESS"
                                ? t.fullAccess
                                : t.readOnly}
                            </span>
                            {/* 利用不可表示 */}
                            {!isAvailable && (
                              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                {t.toolUnavailable}
                              </span>
                            )}
                            {/* テスト不可表示（利用可能だがテスト不可の場合） */}
                            {isAvailable && !tool.testable && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                {t.notTestable}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* パラメータ入力（ツール選択後） */}
            {selectedTestTool && (
              <div className="space-y-2">
                <Label>
                  {t.parameters}: {selectedTestTool.name}
                </Label>
                {selectedTestTool.parameters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noParameters}</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTestTool.parameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <label className="text-sm text-muted-foreground">
                          {param.name}
                          {param.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                          {param.optional && (
                            <span className="text-muted-foreground ml-1">
                              ({language === "ja" ? "任意" : "optional"})
                            </span>
                          )}
                        </label>
                        <Input
                          type={param.type === "number" ? "number" : "text"}
                          value={testParams[param.name] || ""}
                          onChange={(e) =>
                            setTestParams({
                              ...testParams,
                              [param.name]: e.target.value,
                            })
                          }
                          placeholder={param.description}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2">
                  <Button onClick={runToolTest} disabled={runningTest}>
                    {runningTest ? t.loading : t.runTest}
                  </Button>
                </div>
              </div>
            )}

            {/* テスト結果 */}
            {testResult && testKeyValidated && (
              <div className="space-y-2">
                <Label>{t.testResult}</Label>
                <div
                  className={`p-4 rounded-lg text-sm whitespace-pre-wrap font-mono ${
                    testResult.success
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {testResult.success ? testResult.result : testResult.error}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestModal(false)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
