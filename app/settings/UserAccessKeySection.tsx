"use client";

import { useCallback, useEffect, useState } from "react";
import { RiInformationLine, RiKey2Line } from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UserAccessKeySectionProps {
  language?: string;
}

interface UserAccessKey {
  id: string;
  accessKey: {
    id: string;
    name: string;
    description: string | null;
    menuPaths: string;
    expiresAt: string;
    isActive: boolean;
  };
  createdAt: string;
}

export function UserAccessKeySection({
  language = "ja",
}: UserAccessKeySectionProps) {
  const [accessKeys, setAccessKeys] = useState<UserAccessKey[]>([]);
  const [newKey, setNewKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // 登録済みアクセスキーを取得
  const fetchAccessKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/access-keys");
      const data = await res.json();

      if (res.ok) {
        setAccessKeys(data.userAccessKeys || []);
      }
    } catch (error) {
      console.error("Failed to fetch access keys:", error);
    }
  }, []);

  useEffect(() => {
    fetchAccessKeys();
  }, [fetchAccessKeys]);

  // アクセスキーを登録
  const handleRegister = async () => {
    if (!newKey.trim()) {
      setMessage({
        type: "error",
        text: t("Please enter an access key", "アクセスキーを入力してください"),
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: newKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: t(
            "Access key registered successfully",
            "アクセスキーを登録しました",
          ),
        });
        setNewKey("");
        await fetchAccessKeys();
      } else {
        setMessage({
          type: "error",
          text:
            data.error ||
            t(
              "Failed to register access key",
              "アクセスキーの登録に失敗しました",
            ),
        });
      }
    } catch (error) {
      console.error("Failed to register access key:", error);
      setMessage({
        type: "error",
        text: t(
          "Failed to register access key",
          "アクセスキーの登録に失敗しました",
        ),
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // アクセスキーを削除
  const handleDelete = async (id: string) => {
    if (
      !confirm(t("Remove this access key?", "このアクセスキーを削除しますか？"))
    ) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/user/access-keys?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: t(
            "Access key removed successfully",
            "アクセスキーを削除しました",
          ),
        });
        await fetchAccessKeys();
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text:
            data.error ||
            t(
              "Failed to remove access key",
              "アクセスキーの削除に失敗しました",
            ),
        });
      }
    } catch (error) {
      console.error("Failed to remove access key:", error);
      setMessage({
        type: "error",
        text: t(
          "Failed to remove access key",
          "アクセスキーの削除に失敗しました",
        ),
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {t("Access Keys", "アクセスキー")}
      </h2>

      <p className="text-sm text-muted-foreground mb-6">
        {t(
          "Register access keys issued by the administrator to unlock additional features.",
          "管理者から発行されたアクセスキーを登録することで、追加機能にアクセスできます。",
        )}
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

      {/* 新規アクセスキー登録 */}
      <div className="mb-6 p-4 bg-muted rounded-lg border">
        <h3 className="text-md font-medium mb-3">
          {t("Register New Access Key", "新しいアクセスキーを登録")}
        </h3>
        <div className="flex gap-2">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t("Enter access key code", "アクセスキーコードを入力")}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleRegister}
            disabled={isLoading || !newKey.trim()}
            loading={isLoading}
          >
            {t("Register", "登録")}
          </Button>
        </div>
      </div>

      {/* 登録済みアクセスキー一覧 */}
      <div>
        <h3 className="text-md font-medium mb-3">
          {t("Registered Access Keys", "登録済みアクセスキー")}
        </h3>

        {accessKeys.length === 0 ? (
          <div className="p-6 bg-muted rounded-lg border text-center">
            <RiKey2Line className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {t(
                "No access keys registered",
                "登録済みのアクセスキーはありません",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accessKeys.map((userAccessKey) => {
              const { accessKey } = userAccessKey;
              const isExpired = new Date(accessKey.expiresAt) < new Date();
              const isInactive = !accessKey.isActive;

              return (
                <Card key={userAccessKey.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{accessKey.name}</h4>
                          {(isExpired || isInactive) && (
                            <Badge variant="destructive">
                              {isExpired
                                ? t("Expired", "期限切れ")
                                : t("Inactive", "無効")}
                            </Badge>
                          )}
                          {!isExpired && accessKey.isActive && (
                            <Badge variant="default">
                              {t("Active", "有効")}
                            </Badge>
                          )}
                        </div>
                        {accessKey.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {accessKey.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("Expires", "有効期限")}:{" "}
                          {new Date(accessKey.expiresAt).toLocaleDateString(
                            language === "ja" ? "ja-JP" : "en-US",
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(userAccessKey.id)}
                        disabled={isLoading}
                        className="ml-4 border-destructive text-destructive hover:bg-destructive/10"
                      >
                        {t("Remove", "削除")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 注意書き */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <RiInformationLine className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">
              {t("About Access Keys", "アクセスキーについて")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>
                {t(
                  "Access keys are issued by administrators and grant access to specific features",
                  "アクセスキーは管理者によって発行され、特定の機能へのアクセスを許可します",
                )}
              </li>
              <li>
                {t(
                  "Each key has an expiration date and can be deactivated by administrators",
                  "各キーには有効期限があり、管理者によって無効化されることがあります",
                )}
              </li>
              <li>
                {t(
                  "To get an access key, contact your system administrator",
                  "アクセスキーを取得するには、システム管理者に連絡してください",
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
