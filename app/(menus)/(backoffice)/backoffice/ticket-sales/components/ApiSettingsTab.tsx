"use client";

import { AlertTriangle, CheckCircle, Copy, Key, Loader2, Clock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NfcReader } from "@/components/NfcReader";
import { ticketSalesTranslations } from "../translations";

interface ApiSettingsTabProps {
  language: "en" | "ja";
}

interface ApiKeyConfig {
  configured: boolean;
  adminNfcId: string | null;
  adminEmail: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string | null;
}

export default function ApiSettingsTab({ language }: ApiSettingsTabProps) {
  const t = ticketSalesTranslations[language];

  const [config, setConfig] = useState<ApiKeyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adminNfcId, setAdminNfcId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nfcReadSuccess, setNfcReadSuccess] = useState(false);
  const [isReadingNfc, setIsReadingNfc] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/ticket-sales/api-keys");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.adminNfcId) setAdminNfcId(data.adminNfcId);
        if (data.adminEmail) setAdminEmail(data.adminEmail);
      }
    } catch (error) {
      console.error("Error fetching API key config:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleGenerateKey = async () => {
    if (!adminNfcId || !adminEmail) return;

    setIsGenerating(true);
    setGeneratedKey(null);

    try {
      const res = await fetch("/api/ticket-sales/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNfcId, adminEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.apiKey);
        await fetchConfig();
      }
    } catch (error) {
      console.error("Error generating API key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNfcRead = useCallback((nfcId: string) => {
    setAdminNfcId(nfcId);
    setNfcReadSuccess(true);
    setIsReadingNfc(false);
    setTimeout(() => setNfcReadSuccess(false), 3000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 現在の状態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t.apiTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.apiDescription}</p>

          {config?.configured ? (
            config.isExpired ? (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <span>{t.apiKeyExpired}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span>{t.apiKeyConfigured}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span>{t.apiKeyNotConfigured}</span>
            </div>
          )}

          {config?.configured && (
            <div className="space-y-2 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t.adminNfcId}: </span>
                <span className="font-mono">{config.adminNfcId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t.adminEmail}: </span>
                <span>{config.adminEmail}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t.createdAt}: </span>
                <span>
                  {config.createdAt
                    ? new Date(config.createdAt).toLocaleString(
                        language === "ja" ? "ja-JP" : "en-US"
                      )
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t.expiresAt}: </span>
                {config.expiresAt ? (
                  <span className={config.isExpired ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                    {new Date(config.expiresAt).toLocaleString(
                      language === "ja" ? "ja-JP" : "en-US"
                    )}
                    {config.isExpired && ` (${t.apiKeyExpired})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t.apiKeyNoExpiration}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* APIキー発行フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>
            {config?.configured ? t.regenerateApiKey : t.generateApiKey}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {t.adminNfcId}
            </label>
            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={adminNfcId}
                onChange={(e) => setAdminNfcId(e.target.value)}
                placeholder={t.apiKeyPlaceholder}
                className="flex-1 font-mono"
                readOnly
              />
              <NfcReader
                onRead={handleNfcRead}
                disabled={isReadingNfc}
                mode="button"
                buttonText={t.readNfcCard}
                buttonLoadingText={t.readingNfc}
              />
            </div>
            {nfcReadSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {t.nfcReadSuccess}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">
              {t.adminEmail}
            </label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={t.adminEmailPlaceholder}
              className="max-w-md"
            />
          </div>

          <Button
            onClick={handleGenerateKey}
            disabled={!adminNfcId || !adminEmail || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.loading}
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                {config?.configured ? t.regenerateApiKey : t.generateApiKey}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 発行されたAPIキーの表示 */}
      {generatedKey && (
        <Card className="border-green-500 dark:border-green-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              {t.apiKeyGenerated}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{t.apiKeyWarning}</span>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                {generatedKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? t.copiedApiKey : t.copyApiKey}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
