"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LdapConfig {
  id: string;
  isEnabled: boolean;
  serverUrl: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  searchFilter: string;
  timeout: number;
}

interface LdapSettingsClientProps {
  language: "en" | "ja";
}

export function LdapSettingsClient({ language }: LdapSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"config" | "test">("config");
  const [config, setConfig] = useState<LdapConfig>({
    id: "",
    isEnabled: false,
    serverUrl: "",
    baseDN: "",
    bindDN: "",
    bindPassword: "",
    searchFilter: "(uid={username})",
    timeout: 10000,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // テスト用
  const [testUsername, setTestUsername] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // 設定を取得
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/ldap-config");
        if (!response.ok) {
          throw new Error("Failed to fetch LDAP config");
        }
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error("Error fetching LDAP config:", error);
        // 開発環境でLDAPサーバがない場合でもデフォルト値で設定画面を表示
        setConfig({
          id: "",
          isEnabled: false,
          serverUrl: "",
          baseDN: "",
          bindDN: "",
          bindPassword: "",
          searchFilter: "(uid={username})",
          timeout: 10000,
        });
        setMessage(
          language === "ja"
            ? "LDAP設定をデフォルト値で読み込みました（開発環境ではAPIが利用できない可能性があります）"
            : "LDAP configuration loaded with default values (API not available in development)",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [language]);

  // 設定を保存
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      // クライアント側バリデーション
      if (config.isEnabled) {
        if (!config.serverUrl || !config.baseDN) {
          setMessage(
            t(
              "Server URL and Base DN are required when LDAP is enabled",
              "LDAP認証を有効にする場合、サーバURLとベースDNは必須です",
            ),
          );
          setSaving(false);
          return;
        }
      }

      const response = await fetch("/api/admin/ldap-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save config");
      }

      const data = await response.json();
      setConfig(data.config);
      setMessage(t("Configuration saved successfully", "設定を保存しました"));
    } catch (error) {
      console.error("Error saving LDAP config:", error);
      setMessage(
        t(
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
          error instanceof Error ? error.message : "設定の保存に失敗しました",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // 接続テスト
  const handleTest = async () => {
    if (!testUsername || !testPassword) {
      setTestResult({
        success: false,
        error: t(
          "Username and password are required",
          "ユーザ名とパスワードを入力してください",
        ),
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch("/api/admin/ldap-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
          config: {
            serverUrl: config.serverUrl,
            baseDN: config.baseDN,
            bindDN: config.bindDN || undefined,
            bindPassword: config.bindPassword || undefined,
            searchFilter: config.searchFilter,
            timeout: config.timeout,
          },
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error("Error testing LDAP:", error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">
              {t("Loading...", "読み込み中...")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "config" | "test")}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="config">
              {t("LDAP Configuration", "LDAP設定")}
            </TabsTrigger>
            <TabsTrigger value="test">
              {t("Connection Test", "接続テスト")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* メッセージ */}
        {message && (
          <Alert
            variant={
              message.includes(t("successfully", "成功"))
                ? "default"
                : "destructive"
            }
            className={`mb-6 ${
              message.includes(t("successfully", "成功"))
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                : message.includes(t("default values", "デフォルト値"))
                  ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200"
                  : ""
            }`}
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* LDAP設定タブ */}
        {activeTab === "config" && (
          <div className="space-y-6">
            {/* LDAP認証の有効化/無効化トグル */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {t("LDAP Authentication", "LDAP認証")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Enable or disable LDAP authentication without server restart",
                      "サーバ再起動なしでLDAP認証を有効化/無効化できます",
                    )}
                  </p>
                </div>
                {/* トグルスイッチ */}
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, isEnabled: !config.isEnabled })
                  }
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    config.isEnabled ? "bg-blue-600" : "bg-muted-foreground/30"
                  }`}
                  role="switch"
                  aria-checked={config.isEnabled}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      config.isEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    config.isEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {config.isEnabled
                    ? t("✓ Enabled", "✓ 有効")
                    : t("✗ Disabled", "✗ 無効")}
                </span>
                {config.isEnabled && (!config.serverUrl || !config.baseDN) && (
                  <span className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
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
                    {t(
                      "Required fields must be filled",
                      "必須項目を入力してください",
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Server URL", "サーバURL")}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.serverUrl ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, serverUrl: e.target.value })
                }
                placeholder="ldap://ldap.example.com:389"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Base DN */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Base DN", "ベースDN")}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.baseDN ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, baseDN: e.target.value })
                }
                placeholder="ou=Users,dc=example,dc=com"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bind DN */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Bind DN (Optional)", "バインドDN（オプション）")}
              </label>
              <input
                type="text"
                value={config.bindDN ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, bindDN: e.target.value })
                }
                placeholder="cn=admin,dc=example,dc=com"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bind Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t(
                  "Bind Password (Optional)",
                  "バインドパスワード（オプション）",
                )}
              </label>
              <input
                type="password"
                value={config.bindPassword ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, bindPassword: e.target.value })
                }
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Search Filter", "検索フィルター")}
              </label>
              <input
                type="text"
                value={config.searchFilter ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, searchFilter: e.target.value })
                }
                placeholder="(uid={username})"
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Timeout (ms)", "タイムアウト（ミリ秒）")}
              </label>
              <input
                type="number"
                value={config.timeout ?? 10000}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    timeout: Number.parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 保存ボタン */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {t("Save Configuration", "設定を保存")}
              </button>
            </div>
          </div>
        )}

        {/* 接続テストタブ */}
        {activeTab === "test" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Test Username", "テストユーザ名")}
              </label>
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder={t("Enter username", "ユーザ名を入力")}
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("Test Password", "テストパスワード")}
              </label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder={t("Enter password", "パスワードを入力")}
                className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              {t("Test Connection", "接続テスト")}
            </button>

            {/* テスト結果 */}
            {testResult && (
              <div
                className={`p-4 rounded-lg ${
                  testResult.success
                    ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    testResult.success
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {testResult.success
                    ? t("✓ Connection Successful", "✓ 接続成功")
                    : t("✗ Connection Failed", "✗ 接続失敗")}
                </h4>

                {testResult.error && (
                  <p className="text-red-700 dark:text-red-300 text-sm mb-2">
                    {testResult.error}
                  </p>
                )}

                {testResult.success && testResult.userInfo && (
                  <div className="mt-4">
                    <h5 className="font-medium text-foreground mb-2">
                      {t("LDAP Attributes:", "LDAP属性：")}
                    </h5>
                    <div className="bg-card p-3 rounded border text-sm font-mono overflow-x-auto">
                      <pre>{JSON.stringify(testResult.userInfo, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
