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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "settings" | "test";

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
  emailDomain: string;
  timeout: number;
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
    },
    settings: {
      title: "Legacy LDAP Configuration",
      description: "Configure connection settings for the legacy LDAP server",
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
      emailDomain: "Email Domain",
      emailDomainPlaceholder: "example.com",
      emailDomainHelp: "Used to generate email when LDAP has no mail attribute",
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
    loading: "Loading...",
    notConfigured: "Not configured",
  },
  ja: {
    title: "LDAPマイグレーション",
    description: "OpenLDAPへの段階的移行のためのレガシーLDAP設定",
    tabs: {
      settings: "設定",
      test: "接続テスト",
    },
    settings: {
      title: "レガシーLDAP設定",
      description: "レガシーLDAPサーバへの接続設定を行います",
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
      emailDomain: "メールドメイン",
      emailDomainPlaceholder: "example.co.jp",
      emailDomainHelp: "mail属性がない場合にメールアドレスを生成するために使用",
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
      searchTest: "ユーザ検索テスト",
      searchTestDescription: "LDAPディレクトリ内のユーザを検索します",
      authTest: "認証テスト",
      authTestDescription: "ユーザ名とパスワードで認証をテストします",
      username: "ユーザ名",
      usernamePlaceholder: "ユーザ名を入力",
      password: "パスワード",
      passwordPlaceholder: "パスワードを入力",
      runTest: "テスト実行",
      testing: "テスト中...",
      result: "結果",
      success: "成功",
      failed: "失敗",
      userDN: "ユーザDN",
      email: "メールアドレス",
      displayName: "表示名",
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
    emailDomain: "",
    timeout: 10000,
  });

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
        const data = await response.json();
        if (data.legacyLdapConfig) {
          setLegacyConfig(data.legacyLdapConfig);
        }
        setMessage({ type: "success", text: t.settings.saved });
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
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.title}</CardTitle>
              <CardDescription>{t.settings.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 2x2 Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
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
                      setLegacyConfig({
                        ...legacyConfig,
                        baseDN: e.target.value,
                      })
                    }
                    placeholder={t.settings.baseDNPlaceholder}
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

                {/* Email Domain */}
                <div className="space-y-2">
                  <Label htmlFor="emailDomain">{t.settings.emailDomain}</Label>
                  <Input
                    id="emailDomain"
                    value={legacyConfig.emailDomain}
                    onChange={(e) =>
                      setLegacyConfig({
                        ...legacyConfig,
                        emailDomain: e.target.value,
                      })
                    }
                    placeholder={t.settings.emailDomainPlaceholder}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings.emailDomainHelp}
                  </p>
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
                  disabled={testing !== null}
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
                  disabled={testing !== null || !testUsername}
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
                  disabled={testing !== null || !testUsername || !testPassword}
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
      </Tabs>
    </div>
  );
}
