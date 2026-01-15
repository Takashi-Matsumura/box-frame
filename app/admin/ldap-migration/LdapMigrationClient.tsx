"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "settings" | "test" | "stats";

interface LdapMigrationClientProps {
  language: string;
  tab: TabType;
}

interface LegacyLdapConfig {
  id?: string;
  serverUrl: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  searchFilter: string;
  timeout: number;
  isEnabled: boolean;
}

interface MigrationConfig {
  enabled: boolean;
  startDate: string | null;
  endDate: string | null;
}

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  pendingUsers: number;
  migrationPercentage: number;
}

interface TestResult {
  success: boolean;
  error?: string;
  message?: string;
  messageJa?: string;
  userDN?: string;
  email?: string;
  displayName?: string;
}

const translations = {
  en: {
    title: "LDAP Migration",
    description:
      "Configure legacy LDAP settings for lazy migration to OpenLDAP",
    tabs: {
      settings: "Settings",
      test: "Connection Test",
      stats: "Migration Stats",
    },
    settings: {
      title: "Legacy LDAP Configuration",
      description: "Configure connection settings for the legacy LDAP server",
      enabled: "Enable Legacy LDAP Authentication",
      enabledDescription:
        "When enabled, authentication will fall back to legacy LDAP if OpenLDAP fails",
      serverUrl: "Server URL",
      serverUrlPlaceholder: "ldap://ldap.example.com:389",
      baseDN: "Base DN",
      baseDNPlaceholder: "ou=Users,dc=example,dc=com",
      bindDN: "Bind DN",
      bindDNPlaceholder: "cn=admin,dc=example,dc=com",
      bindPassword: "Bind Password",
      bindPasswordPlaceholder: "Leave empty for anonymous bind",
      searchFilter: "Search Filter",
      searchFilterPlaceholder: "(uid={username})",
      timeout: "Timeout (ms)",
      save: "Save Settings",
      saving: "Saving...",
      saved: "Settings saved successfully",
      error: "Failed to save settings",
    },
    test: {
      title: "Connection Test",
      description:
        "Test connection and authentication against the legacy LDAP server",
      connectionTest: "Connection Test",
      connectionTestDescription: "Test basic connectivity to the LDAP server",
      searchTest: "User Search Test",
      searchTestDescription: "Search for a user in the LDAP directory",
      authTest: "Authentication Test",
      authTestDescription:
        "Test user authentication with username and password",
      username: "Username",
      usernamePlaceholder: "Enter username",
      password: "Password",
      passwordPlaceholder: "Enter password",
      runTest: "Run Test",
      testing: "Testing...",
      result: "Result",
      success: "Success",
      failed: "Failed",
      userDN: "User DN",
      email: "Email",
      displayName: "Display Name",
    },
    stats: {
      title: "Migration Statistics",
      description: "Overview of the LDAP migration progress",
      migrationPeriod: "Migration Period",
      startDate: "Start Date",
      endDate: "End Date",
      periodStatus: {
        not_configured: "Not Configured",
        before: "Before Period",
        active: "Active",
        after: "Period Ended",
      },
      totalUsers: "Total Users",
      migratedUsers: "Migrated Users",
      pendingUsers: "Pending Users",
      progress: "Migration Progress",
      enableMigration: "Enable Migration",
      disableMigration: "Disable Migration",
      saveConfig: "Save Configuration",
    },
    loading: "Loading...",
    notConfigured: "Not configured",
  },
  ja: {
    title: "LDAPマイグレーション",
    description: "OpenLDAPへの段階的移行のためのレガシーLDAP設定",
    tabs: {
      settings: "設定",
      test: "接続テスト",
      stats: "移行状況",
    },
    settings: {
      title: "レガシーLDAP設定",
      description: "レガシーLDAPサーバへの接続設定を行います",
      enabled: "レガシーLDAP認証を有効化",
      enabledDescription:
        "有効にすると、OpenLDAP認証に失敗した場合にレガシーLDAPへフォールバックします",
      serverUrl: "サーバURL",
      serverUrlPlaceholder: "ldap://ldap.example.com:389",
      baseDN: "ベースDN",
      baseDNPlaceholder: "ou=Users,dc=example,dc=com",
      bindDN: "バインドDN",
      bindDNPlaceholder: "cn=admin,dc=example,dc=com",
      bindPassword: "バインドパスワード",
      bindPasswordPlaceholder: "匿名バインドの場合は空のままにしてください",
      searchFilter: "検索フィルタ",
      searchFilterPlaceholder: "(uid={username})",
      timeout: "タイムアウト（ミリ秒）",
      save: "設定を保存",
      saving: "保存中...",
      saved: "設定を保存しました",
      error: "設定の保存に失敗しました",
    },
    test: {
      title: "接続テスト",
      description: "レガシーLDAPサーバへの接続と認証をテストします",
      connectionTest: "接続テスト",
      connectionTestDescription: "LDAPサーバへの基本接続をテストします",
      searchTest: "ユーザー検索テスト",
      searchTestDescription: "LDAPディレクトリ内のユーザーを検索します",
      authTest: "認証テスト",
      authTestDescription: "ユーザー名とパスワードで認証をテストします",
      username: "ユーザー名",
      usernamePlaceholder: "ユーザー名を入力",
      password: "パスワード",
      passwordPlaceholder: "パスワードを入力",
      runTest: "テスト実行",
      testing: "テスト中...",
      result: "結果",
      success: "成功",
      failed: "失敗",
      userDN: "ユーザーDN",
      email: "メールアドレス",
      displayName: "表示名",
    },
    stats: {
      title: "移行統計",
      description: "LDAP移行の進捗状況を確認します",
      migrationPeriod: "移行期間",
      startDate: "開始日",
      endDate: "終了日",
      periodStatus: {
        not_configured: "未設定",
        before: "開始前",
        active: "実施中",
        after: "終了",
      },
      totalUsers: "総ユーザー数",
      migratedUsers: "移行済み",
      pendingUsers: "未移行",
      progress: "移行進捗",
      enableMigration: "移行を有効化",
      disableMigration: "移行を無効化",
      saveConfig: "設定を保存",
    },
    loading: "読み込み中...",
    notConfigured: "未設定",
  },
};

export function LdapMigrationClient({
  language,
  tab,
}: LdapMigrationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t =
    translations[language as keyof typeof translations] || translations.ja;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Legacy LDAP Config
  const [legacyConfig, setLegacyConfig] = useState<LegacyLdapConfig>({
    serverUrl: "",
    baseDN: "",
    bindDN: "",
    bindPassword: "",
    searchFilter: "(uid={username})",
    timeout: 10000,
    isEnabled: false,
  });

  // Migration Config
  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig>({
    enabled: false,
    startDate: null,
    endDate: null,
  });

  // Migration Stats
  const [stats, setStats] = useState<MigrationStats>({
    totalUsers: 0,
    migratedUsers: 0,
    pendingUsers: 0,
    migrationPercentage: 0,
  });

  const [periodStatus, setPeriodStatus] = useState<string>("not_configured");

  // Test State
  const [testUsername, setTestUsername] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/ldap-migration");
      if (response.ok) {
        const data = await response.json();
        if (data.legacyLdapConfig) {
          setLegacyConfig(data.legacyLdapConfig);
        }
        if (data.config) {
          setMigrationConfig(data.config);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.periodStatus) {
          setPeriodStatus(data.periodStatus);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab change handler
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`);
  };

  // Save legacy LDAP config
  const saveLegacyConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/admin/ldap-migration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyConfig),
      });

      if (response.ok) {
        setMessage({ type: "success", text: t.settings.saved });
        await loadData();
      } else {
        setMessage({ type: "error", text: t.settings.error });
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      setMessage({ type: "error", text: t.settings.error });
    } finally {
      setSaving(false);
    }
  };

  // Save migration config
  const saveMigrationConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/admin/ldap-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(migrationConfig),
      });

      if (response.ok) {
        setMessage({ type: "success", text: t.settings.saved });
        await loadData();
      } else {
        setMessage({ type: "error", text: t.settings.error });
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      setMessage({ type: "error", text: t.settings.error });
    } finally {
      setSaving(false);
    }
  };

  // Run test
  const runTest = async (testType: "connection" | "search" | "auth") => {
    try {
      setTesting(testType);
      setTestResult(null);

      const body: Record<string, string> = { testType };
      if (testType === "search" || testType === "auth") {
        body.username = testUsername;
      }
      if (testType === "auth") {
        body.password = testPassword;
      }

      const response = await fetch("/api/admin/ldap-migration/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult({
        success: false,
        error: "Test request failed",
      });
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          <TabsTrigger value="test">{t.tabs.test}</TabsTrigger>
          <TabsTrigger value="stats">{t.tabs.stats}</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.title}</CardTitle>
              <CardDescription>{t.settings.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.settings.enabled}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.enabledDescription}
                  </p>
                </div>
                <Switch
                  checked={legacyConfig.isEnabled}
                  onCheckedChange={(checked) =>
                    setLegacyConfig({ ...legacyConfig, isEnabled: checked })
                  }
                />
              </div>

              {/* Server URL */}
              <div className="space-y-2">
                <Label htmlFor="serverUrl">{t.settings.serverUrl}</Label>
                <Input
                  id="serverUrl"
                  value={legacyConfig.serverUrl}
                  onChange={(e) =>
                    setLegacyConfig({
                      ...legacyConfig,
                      serverUrl: e.target.value,
                    })
                  }
                  placeholder={t.settings.serverUrlPlaceholder}
                />
              </div>

              {/* Base DN */}
              <div className="space-y-2">
                <Label htmlFor="baseDN">{t.settings.baseDN}</Label>
                <Input
                  id="baseDN"
                  value={legacyConfig.baseDN}
                  onChange={(e) =>
                    setLegacyConfig({ ...legacyConfig, baseDN: e.target.value })
                  }
                  placeholder={t.settings.baseDNPlaceholder}
                />
              </div>

              {/* Bind DN */}
              <div className="space-y-2">
                <Label htmlFor="bindDN">{t.settings.bindDN}</Label>
                <Input
                  id="bindDN"
                  value={legacyConfig.bindDN}
                  onChange={(e) =>
                    setLegacyConfig({ ...legacyConfig, bindDN: e.target.value })
                  }
                  placeholder={t.settings.bindDNPlaceholder}
                />
              </div>

              {/* Bind Password */}
              <div className="space-y-2">
                <Label htmlFor="bindPassword">{t.settings.bindPassword}</Label>
                <Input
                  id="bindPassword"
                  type="password"
                  value={legacyConfig.bindPassword}
                  onChange={(e) =>
                    setLegacyConfig({
                      ...legacyConfig,
                      bindPassword: e.target.value,
                    })
                  }
                  placeholder={t.settings.bindPasswordPlaceholder}
                />
              </div>

              {/* Search Filter */}
              <div className="space-y-2">
                <Label htmlFor="searchFilter">{t.settings.searchFilter}</Label>
                <Input
                  id="searchFilter"
                  value={legacyConfig.searchFilter}
                  onChange={(e) =>
                    setLegacyConfig({
                      ...legacyConfig,
                      searchFilter: e.target.value,
                    })
                  }
                  placeholder={t.settings.searchFilterPlaceholder}
                />
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <Label htmlFor="timeout">{t.settings.timeout}</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={legacyConfig.timeout}
                  onChange={(e) =>
                    setLegacyConfig({
                      ...legacyConfig,
                      timeout: parseInt(e.target.value, 10) || 10000,
                    })
                  }
                />
              </div>

              {/* Save Button */}
              <Button onClick={saveLegacyConfig} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.settings.saving}
                  </>
                ) : (
                  t.settings.save
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.test.title}</CardTitle>
              <CardDescription>{t.test.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Test */}
              <div className="space-y-2">
                <h3 className="font-medium">{t.test.connectionTest}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.test.connectionTestDescription}
                </p>
                <Button
                  onClick={() => runTest("connection")}
                  disabled={testing !== null || !legacyConfig.isEnabled}
                >
                  {testing === "connection" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.test.testing}
                    </>
                  ) : (
                    t.test.runTest
                  )}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Search Test */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{t.test.searchTest}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.test.searchTestDescription}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testUsername">{t.test.username}</Label>
                  <Input
                    id="testUsername"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    placeholder={t.test.usernamePlaceholder}
                  />
                </div>
                <Button
                  onClick={() => runTest("search")}
                  disabled={
                    testing !== null || !testUsername || !legacyConfig.isEnabled
                  }
                >
                  {testing === "search" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.test.testing}
                    </>
                  ) : (
                    t.test.runTest
                  )}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Auth Test */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{t.test.authTest}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.test.authTestDescription}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authUsername">{t.test.username}</Label>
                    <Input
                      id="authUsername"
                      value={testUsername}
                      onChange={(e) => setTestUsername(e.target.value)}
                      placeholder={t.test.usernamePlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authPassword">{t.test.password}</Label>
                    <Input
                      id="authPassword"
                      type="password"
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      placeholder={t.test.passwordPlaceholder}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => runTest("auth")}
                  disabled={
                    testing !== null ||
                    !testUsername ||
                    !testPassword ||
                    !legacyConfig.isEnabled
                  }
                >
                  {testing === "auth" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.test.testing}
                    </>
                  ) : (
                    t.test.runTest
                  )}
                </Button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-4 rounded-md space-y-2 ${
                    testResult.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.test.result}:</span>
                    <Badge
                      variant={testResult.success ? "default" : "destructive"}
                    >
                      {testResult.success ? t.test.success : t.test.failed}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {language === "ja"
                      ? testResult.messageJa || testResult.message
                      : testResult.message}
                  </p>
                  {testResult.userDN && (
                    <p className="text-sm">
                      <span className="font-medium">{t.test.userDN}:</span>{" "}
                      {testResult.userDN}
                    </p>
                  )}
                  {testResult.email && (
                    <p className="text-sm">
                      <span className="font-medium">{t.test.email}:</span>{" "}
                      {testResult.email}
                    </p>
                  )}
                  {testResult.displayName && (
                    <p className="text-sm">
                      <span className="font-medium">{t.test.displayName}:</span>{" "}
                      {testResult.displayName}
                    </p>
                  )}
                  {testResult.error && !testResult.success && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {testResult.error}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.stats.title}</CardTitle>
              <CardDescription>{t.stats.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Migration Period Status */}
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.stats.migrationPeriod}:</span>
                <Badge
                  variant={
                    periodStatus === "active"
                      ? "default"
                      : periodStatus === "after"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {
                    t.stats.periodStatus[
                      periodStatus as keyof typeof t.stats.periodStatus
                    ]
                  }
                </Badge>
              </div>

              {/* Period Config */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t.stats.startDate}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={migrationConfig.startDate || ""}
                    onChange={(e) =>
                      setMigrationConfig({
                        ...migrationConfig,
                        startDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t.stats.endDate}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={migrationConfig.endDate || ""}
                    onChange={(e) =>
                      setMigrationConfig({
                        ...migrationConfig,
                        endDate: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>

              {/* Enable/Disable Migration */}
              <div className="flex items-center gap-4">
                <Button
                  variant={migrationConfig.enabled ? "destructive" : "default"}
                  onClick={() =>
                    setMigrationConfig({
                      ...migrationConfig,
                      enabled: !migrationConfig.enabled,
                    })
                  }
                >
                  {migrationConfig.enabled
                    ? t.stats.disableMigration
                    : t.stats.enableMigration}
                </Button>
                <Button onClick={saveMigrationConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.stats.saveConfig
                  )}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.stats.totalUsers}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.stats.migratedUsers}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.migratedUsers}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.stats.pendingUsers}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.pendingUsers}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.stats.progress}</span>
                  <span>{stats.migrationPercentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${stats.migrationPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
