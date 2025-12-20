"use client";

import type { AccessKey } from "@prisma/client";
import { useState } from "react";
import type { AppMenu } from "@/types/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Power, PowerOff, Trash2, Plus } from "lucide-react";

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

interface AccessKeyManagerProps {
  accessKeys: AccessKeyWithTargetUser[];
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  }>;
  menus: AppMenu[];
  adminId: string;
  language?: string;
}

export function AccessKeyManager({
  accessKeys: initialAccessKeys,
  users,
  menus,
  adminId,
  language = "en",
}: AccessKeyManagerProps) {
  const [accessKeys, setAccessKeys] = useState(initialAccessKeys);
  const [isCreating, setIsCreating] = useState(false);

  // デフォルトは1年後
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    name: "",
    expiresAt: getDefaultExpiryDate(),
    targetUserId: "",
    menuPaths: [] as string[],
  });

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const handleCreate = async () => {
    if (
      !formData.name ||
      !formData.targetUserId ||
      formData.menuPaths.length === 0
    ) {
      alert(
        t(
          "Please enter a name, select a target user, and select at least one menu",
          "名前、対象ユーザ、および少なくとも1つのメニューを選択してください",
        ),
      );
      return;
    }

    try {
      const response = await fetch("/api/admin/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create Access key");
      }

      const { accessKey } = await response.json();
      setAccessKeys([accessKey, ...accessKeys]);
      setFormData({
        name: "",
        expiresAt: getDefaultExpiryDate(),
        targetUserId: "",
        menuPaths: [],
      });
      setIsCreating(false);
      alert(
        t(
          `Access key created successfully:\n\n${accessKey.key}\n\nPlease copy and save this key.`,
          `アクセスキーが正常に作成されました:\n\n${accessKey.key}\n\nこのキーをコピーして保存してください。`,
        ),
      );
    } catch (error) {
      console.error("Error creating Access key:", error);
      alert(
        t(
          `Failed to create Access key: ${error instanceof Error ? error.message : "Unknown error"}`,
          `アクセスキーの作成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        ),
      );
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/admin/access-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update Access key");

      setAccessKeys(
        accessKeys.map((key) =>
          key.id === id ? { ...key, isActive: !currentStatus } : key,
        ),
      );
    } catch (error) {
      console.error("Error updating Access key:", error);
      alert(
        t("Failed to update Access key", "アクセスキーの更新に失敗しました"),
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        t(
          "Are you sure you want to delete this Access key?",
          "このアクセスキーを削除してもよろしいですか？",
        ),
      )
    )
      return;

    try {
      const response = await fetch(`/api/admin/access-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete Access key");

      setAccessKeys(accessKeys.filter((key) => key.id !== id));
    } catch (error) {
      console.error("Error deleting Access key:", error);
      alert(
        t("Failed to delete Access key", "アクセスキーの削除に失敗しました"),
      );
    }
  };

  const toggleMenu = (menuPath: string) => {
    setFormData((prev) => ({
      ...prev,
      menuPaths: prev.menuPaths.includes(menuPath)
        ? prev.menuPaths.filter((path) => path !== menuPath)
        : [...prev.menuPaths, menuPath],
    }));
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      alert(
        t(
          "Access key copied to clipboard",
          "アクセスキーをクリップボードにコピーしました",
        ),
      );
    } catch (error) {
      console.error("Failed to copy:", error);
      alert(
        t("Failed to copy access key", "アクセスキーのコピーに失敗しました"),
      );
    }
  };

  const handleCloseModal = () => {
    setIsCreating(false);
    setFormData({
      name: "",
      expiresAt: getDefaultExpiryDate(),
      targetUserId: "",
      menuPaths: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Access Keys List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("Access Keys", "アクセスキー")}</CardTitle>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("Create", "作成")}
          </Button>
        </CardHeader>
        <CardContent>
          {accessKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t(
                "No access keys have been issued yet",
                "まだアクセスキーは発行されていません",
              )}
            </div>
          ) : (
            <>
              {/* 合計表示 */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("Total", "合計")}:{" "}
                  <span className="font-medium text-foreground">{accessKeys.length}</span>
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("Access Key Information", "アクセスキー情報")}</TableHead>
                    <TableHead>{t("Status", "ステータス")}</TableHead>
                    <TableHead>{t("Menus", "メニュー")}</TableHead>
                    <TableHead>{t("Expires", "有効期限")}</TableHead>
                    <TableHead className="text-right">{t("Actions", "操作")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessKeys.map((accessKey) => {
                    const menuPaths = JSON.parse(accessKey.menuPaths) as string[];
                    return (
                      <TableRow key={accessKey.id}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium">{accessKey.name}</div>
                            {accessKey.targetUser ? (
                              <div className="text-sm text-muted-foreground">
                                {accessKey.targetUser.name} ({accessKey.targetUser.email})
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {t("No target user", "対象ユーザなし")}
                              </div>
                            )}
                            <div className="flex items-center gap-2 bg-muted p-2 rounded">
                              <code className="flex-1 font-mono text-xs text-muted-foreground truncate">
                                {accessKey.key}
                              </code>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleCopyKey(accessKey.key)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("Copy to clipboard", "クリップボードにコピー")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {accessKey.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {t("Active", "有効")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              {t("Inactive", "無効")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {menuPaths.map((path) => {
                              const menu = menus.find((m) => m.path === path);
                              return (
                                <div key={path} className="text-sm text-muted-foreground">
                                  • {menu ? (language === "ja" ? menu.nameJa : menu.name) : path}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(accessKey.expiresAt).toLocaleDateString(
                            language === "ja" ? "ja-JP" : "en-US",
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex gap-1 justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      handleToggleActive(accessKey.id, accessKey.isActive)
                                    }
                                  >
                                    {accessKey.isActive ? (
                                      <PowerOff className="h-4 w-4" />
                                    ) : (
                                      <Power className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {accessKey.isActive
                                      ? t("Deactivate", "無効化")
                                      : t("Activate", "有効化")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(accessKey.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("Delete", "削除")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Access Key Modal */}
      <Dialog open={isCreating} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Create New Access Key", "新しいアクセスキーを作成")}</DialogTitle>
            <DialogDescription>
              {t(
                "Create an access key for a user to grant specific menu access.",
                "ユーザに特定のメニューへのアクセスを許可するアクセスキーを作成します。"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Key Name", "キー名")}</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t(
                  "e.g., Manager Access for John",
                  "例: John用マネージャーアクセス",
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("Target User", "対象ユーザ")}</Label>
              <Select
                value={formData.targetUserId}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetUserId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("-- Select a user --", "-- ユーザを選択 --")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("Expiration Date", "有効期限")}</Label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresAt: e.target.value,
                  })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t(
                  "Select Menus to Grant Access",
                  "アクセスを許可するメニューを選択",
                )}
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                {menus.map((menu) => (
                  <label
                    key={menu.id}
                    className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.menuPaths.includes(menu.path)}
                      onChange={() => toggleMenu(menu.path)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {language === "ja" ? menu.nameJa : menu.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{menu.path}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              {t("Cancel", "キャンセル")}
            </Button>
            <Button onClick={handleCreate}>
              {t("Generate Access Key", "アクセスキーを生成")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
