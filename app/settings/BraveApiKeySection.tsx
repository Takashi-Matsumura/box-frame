"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiInformationLine,
} from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BraveApiKeySectionProps {
  language?: string;
}

export function BraveApiKeySection({
  language = "ja",
}: BraveApiKeySectionProps) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // APIキーを取得
  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch("/api/user/brave-api-key");
      const data = await res.json();

      if (res.ok) {
        setHasKey(data.hasKey);
        if (data.hasKey) {
          // セキュリティのため、マスク表示
          setApiKey(data.braveApiKey);
        }
      }
    } catch (error) {
      console.error("Failed to fetch API key:", error);
    }
  }, []);

  useEffect(() => {
    fetchApiKey();
  }, [fetchApiKey]);

  // APIキーを保存
  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({
        type: "error",
        text: t("API key cannot be empty", "APIキーを入力してください"),
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/brave-api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ braveApiKey: apiKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setHasKey(data.hasKey);
        setIsEditing(false);
        setMessage({
          type: "success",
          text: t("API key saved successfully", "APIキーを保存しました"),
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text:
            data.error ||
            t("Failed to save API key", "APIキーの保存に失敗しました"),
        });
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
      setMessage({
        type: "error",
        text: t("Failed to save API key", "APIキーの保存に失敗しました"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // APIキーを削除
  const handleDelete = async () => {
    if (!confirm(t("Delete API key?", "APIキーを削除しますか？"))) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/brave-api-key", {
        method: "DELETE",
      });

      if (res.ok) {
        setApiKey("");
        setHasKey(false);
        setIsEditing(false);
        setMessage({
          type: "success",
          text: t("API key deleted successfully", "APIキーを削除しました"),
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: t("Failed to delete API key", "APIキーの削除に失敗しました"),
        });
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      setMessage({
        type: "error",
        text: t("Failed to delete API key", "APIキーの削除に失敗しました"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {t("Brave Search API Key", "Brave Search APIキー")}
      </h2>

      <p className="text-sm text-muted-foreground mb-4">
        {t(
          "Set your personal Brave Search API key to enable web search in AI Chat. Get your API key from",
          "AIチャットでWeb検索を有効にするには、個人用のBrave Search APIキーを設定してください。APIキーは以下から取得できます：",
        )}{" "}
        <a
          href="https://brave.com/search/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Brave Search API
        </a>
      </p>

      {/* メッセージ表示 */}
      {message && (
        <Alert
          variant={message.type === "error" ? "destructive" : "default"}
          className={
            message.type === "success"
              ? "mb-4 border-green-200 bg-green-50 text-green-800"
              : "mb-4"
          }
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* API Key表示・編集 */}
      {isEditing || !hasKey ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("API Key", "APIキー")}</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="BSA..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <RiEyeOffLine className="w-5 h-5" />
                ) : (
                  <RiEyeLine className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim()}
              loading={isSaving}
            >
              {t("Save", "保存")}
            </Button>
            {hasKey && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  fetchApiKey();
                }}
                disabled={isSaving}
              >
                {t("Cancel", "キャンセル")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <RiCheckLine className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {t("API key is configured", "APIキーが設定されています")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              {t("Edit", "編集")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isSaving}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              {t("Delete", "削除")}
            </Button>
          </div>
        </div>
      )}

      {/* 注意書き */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <RiInformationLine className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">
              {t("About API Key Security", "APIキーのセキュリティについて")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>
                {t(
                  "Your API key is stored securely in the database",
                  "APIキーはデータベースに安全に保存されます",
                )}
              </li>
              <li>
                {t(
                  "Only you can use your API key",
                  "あなたのAPIキーはあなたのみが使用できます",
                )}
              </li>
              <li>
                {t(
                  "Brave Search API has a free tier with 1,000 queries/month",
                  "Brave Search APIは月1,000クエリまで無料で利用できます",
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
