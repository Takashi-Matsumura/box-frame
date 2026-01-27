"use client";

import type { AccessKey } from "@prisma/client";
import { Check, Copy, Plus, Power, PowerOff, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  PermissionTreeSelector,
  type SelectedPermission,
} from "@/components/PermissionTreeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { AppMenu, AppModule } from "@/types/module";

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
  modules: AppModule[];
  adminId: string;
  language?: string;
}

export function AccessKeyManager({
  accessKeys: initialAccessKeys,
  users,
  menus,
  modules,
  adminId,
  language = "en",
}: AccessKeyManagerProps) {
  const [accessKeys, setAccessKeys] = useState(initialAccessKeys);
  const [isCreating, setIsCreating] = useState(false);

  // フィルタリング用のstate
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [searchQuery, setSearchQuery] = useState("");

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
    permissions: [] as SelectedPermission[],
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // フィルタリングされたユーザーリスト
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  // 選択されたユーザーの情報を取得
  const selectedUser = useMemo(
    () => users.find((u) => u.id === formData.targetUserId),
    [users, formData.targetUserId]
  );

  // アクセスキーのフィルタリング
  const filteredAccessKeys = useMemo(() => {
    return accessKeys.filter((key) => {
      // ステータスフィルタ
      if (statusFilter === "active" && !key.isActive) return false;
      if (statusFilter === "inactive" && key.isActive) return false;

      // 検索フィルタ（名前、対象ユーザ名、メールアドレス）
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = key.name.toLowerCase().includes(query);
        const matchesUserName = key.targetUser?.name?.toLowerCase().includes(query) || false;
        const matchesEmail = key.targetUser?.email?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesUserName && !matchesEmail) return false;
      }

      return true;
    });
  }, [accessKeys, statusFilter, searchQuery]);

  const handleCreate = async () => {
    // 新しいpermissions形式または従来のmenuPaths形式をチェック
    const hasPermissions = formData.permissions.length > 0;
    const hasMenuPaths = formData.menuPaths.length > 0;

    if (
      !formData.name ||
      !formData.targetUserId ||
      (!hasPermissions && !hasMenuPaths)
    ) {
      alert(
        t(
          "Please enter a name, select a target user, and select at least one permission",
          "名前、対象ユーザ、および少なくとも1つの権限を選択してください",
        ),
      );
      return;
    }

    try {
      // 新しいpermissions形式を使用する場合、menuPathsも生成（後方互換性）
      const menuPathsFromPermissions = formData.permissions
        .filter((p) => p.menuPath)
        .map((p) => p.menuPath as string);

      const requestBody = {
        ...formData,
        menuPaths: hasPermissions
          ? menuPathsFromPermissions
          : formData.menuPaths,
        permissions: formData.permissions.map((p) => ({
          granularity: p.granularity,
          moduleId: p.moduleId,
          menuPath: p.menuPath,
          tabId: p.tabId,
        })),
      };

      const response = await fetch("/api/admin/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
        permissions: [],
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

  const _toggleMenu = (menuPath: string) => {
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
      permissions: [],
    });
    setUserSearchQuery("");
    setIsUserDropdownOpen(false);
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
              {/* フィルタUI */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* ステータスフィルタ */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">
                    {t("Status", "ステータス")}:
                  </Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">{t("All", "すべて")}</option>
                    <option value="active">{t("Active", "有効")}</option>
                    <option value="inactive">{t("Inactive", "無効")}</option>
                  </select>
                </div>

                {/* 検索フィルタ */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[400px]">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("Search by name or email...", "名前またはメールで検索...")}
                      className="pl-9 h-8"
                    />
                  </div>
                </div>

                {/* 合計表示 */}
                <p className="text-sm text-muted-foreground ml-auto">
                  {t("Showing", "表示")}:{" "}
                  <span className="font-medium text-foreground">
                    {filteredAccessKeys.length}
                  </span>
                  {" / "}
                  <span className="font-medium text-foreground">
                    {accessKeys.length}
                  </span>
                </p>
              </div>
              {filteredAccessKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  {t(
                    "No access keys match your filter criteria",
                    "フィルタ条件に一致するアクセスキーがありません",
                  )}
                </div>
              ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>
                        {t("Access Key Information", "アクセスキー情報")}
                      </TableHead>
                      <TableHead>{t("Status", "ステータス")}</TableHead>
                      <TableHead>{t("Menus", "メニュー")}</TableHead>
                      <TableHead>{t("Expires", "有効期限")}</TableHead>
                      <TableHead className="text-right">
                        {t("Actions", "操作")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccessKeys.map((accessKey) => {
                      const menuPaths = JSON.parse(
                        accessKey.menuPaths,
                      ) as string[];
                      return (
                        <TableRow key={accessKey.id}>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="font-medium">
                                {accessKey.name}
                              </div>
                              {accessKey.targetUser ? (
                                <div className="text-sm text-muted-foreground">
                                  {accessKey.targetUser.name} (
                                  {accessKey.targetUser.email})
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
                                        onClick={() =>
                                          handleCopyKey(accessKey.key)
                                        }
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t(
                                          "Copy to clipboard",
                                          "クリップボードにコピー",
                                        )}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {accessKey.isActive ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                {t("Active", "有効")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground"
                              >
                                {t("Inactive", "無効")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {menuPaths.map((path) => {
                                const menu = menus.find((m) => m.path === path);
                                return (
                                  <div
                                    key={path}
                                    className="text-sm text-muted-foreground"
                                  >
                                    •{" "}
                                    {menu
                                      ? language === "ja"
                                        ? menu.nameJa
                                        : menu.name
                                      : path}
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
                                        handleToggleActive(
                                          accessKey.id,
                                          accessKey.isActive,
                                        )
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Access Key Modal */}
      <Dialog open={isCreating} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("Create New Access Key", "新しいアクセスキーを作成")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Create an access key for a user to grant specific menu access.",
                "ユーザに特定のメニューへのアクセスを許可するアクセスキーを作成します。",
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
              <div className="relative" ref={userSearchRef}>
                {/* 選択済みユーザーの表示 or 検索入力 */}
                {selectedUser && !isUserDropdownOpen ? (
                  <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-background">
                    <span className="text-sm">
                      {selectedUser.name} ({selectedUser.email}) - {selectedUser.role}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setFormData({ ...formData, targetUserId: "" });
                        setUserSearchQuery("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setIsUserDropdownOpen(true);
                      }}
                      onFocus={() => setIsUserDropdownOpen(true)}
                      placeholder={t("Search by name or email...", "名前またはメールで検索...")}
                      className="pl-9"
                    />
                  </div>
                )}

                {/* ユーザードロップダウンリスト */}
                {isUserDropdownOpen && (
                  <>
                    {/* クリック外でドロップダウンを閉じるオーバーレイ */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {t("No users found", "ユーザーが見つかりません")}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                            onClick={() => {
                              setFormData({ ...formData, targetUserId: user.id });
                              setUserSearchQuery("");
                              setIsUserDropdownOpen(false);
                            }}
                          >
                            <span>
                              {user.name} ({user.email}) - {user.role}
                            </span>
                            {formData.targetUserId === user.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
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
                {t("Select Permissions to Grant", "付与する権限を選択")}
              </Label>
              <PermissionTreeSelector
                modules={modules}
                selectedPermissions={formData.permissions}
                onSelectionChange={(permissions) =>
                  setFormData({ ...formData, permissions })
                }
                language={language}
              />
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
