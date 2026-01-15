"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Language, Translations } from "../translations";

interface Manager {
  id: string;
  name: string;
  position: string;
}

interface EmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  positionCode: string | null;
  qualificationGrade: string | null;
  qualificationGradeCode: string | null;
  employmentType: string | null;
  employmentTypeCode: string | null;
  organization: { id: string; name: string } | null;
  department: {
    id: string;
    name: string;
    code: string | null;
    manager: Manager | null;
  } | null;
  section: {
    id: string;
    name: string;
    code: string | null;
    manager: Manager | null;
  } | null;
  course: {
    id: string;
    name: string;
    code: string | null;
    manager: Manager | null;
  } | null;
  joinDate: string | null;
  birthDate: string | null;
  isActive: boolean;
}

interface HistoryChange {
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
}

interface EmployeeHistory {
  id: string;
  validFrom: string;
  validTo: string | null;
  changeType: string;
  changeTypeJa: string;
  changeReason: string | null;
  department: string | null;
  section: string | null;
  course: string | null;
  position: string;
  positionCode: string | null;
  qualificationGrade: string | null;
  qualificationGradeCode: string | null;
  employmentType: string | null;
  employmentTypeCode: string | null;
  isActive: boolean;
  changes: HistoryChange[];
  changedBy: string;
  changedAt: string;
}

interface EmployeeDetailDialogProps {
  employeeId: string | null;
  onClose: () => void;
  t: Translations;
  language: Language;
}

// 役職に基づいて色を決定
function getPositionColor(position: string): string {
  if (position.includes("本部長") || position.includes("部長")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  }
  if (position.includes("課長") || position.includes("マネージャー")) {
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
  }
  if (position.includes("主任") || position.includes("リーダー")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  return "bg-muted text-muted-foreground";
}

// 変更タイプに基づいて色を決定
function getChangeTypeColor(changeType: string): string {
  switch (changeType) {
    case "CREATE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "TRANSFER":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "PROMOTION":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "RETIREMENT":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "REJOINING":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// 変更タイプのアイコン
function getChangeTypeIcon(changeType: string): string {
  switch (changeType) {
    case "CREATE":
      return "M12 4v16m8-8H4"; // Plus
    case "TRANSFER":
      return "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"; // Arrows
    case "PROMOTION":
      return "M5 10l7-7m0 0l7 7m-7-7v18"; // Arrow up
    case "RETIREMENT":
      return "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"; // Logout
    case "REJOINING":
      return "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"; // Login
    default:
      return "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"; // Edit
  }
}

// 名前からイニシャルを取得
function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0);
  }
  return name.slice(0, 2);
}

// 日付フォーマット
function formatDate(dateStr: string | null, language: Language): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (language === "ja") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 短い日付フォーマット
function formatShortDate(dateStr: string, language: Language): string {
  const date = new Date(dateStr);
  if (language === "ja") {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EmployeeDetailDialog({
  employeeId,
  onClose,
  t,
  language,
}: EmployeeDetailDialogProps) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [histories, setHistories] = useState<EmployeeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // 社員詳細を取得
  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      setHistories([]);
      setActiveTab("basic");
      return;
    }

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/organization/employees/${employeeId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch employee");
        const data = await response.json();
        setEmployee(data.employee);
      } catch (err) {
        setError(t.error);
        console.error("Error fetching employee:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, t.error]);

  // 履歴を取得
  const fetchHistory = useCallback(async () => {
    if (!employeeId) return;

    try {
      setHistoryLoading(true);
      const response = await fetch(
        `/api/organization/employees/${employeeId}/history`,
      );
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistories(data.histories || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [employeeId]);

  // タブが履歴に切り替わった時に履歴を取得
  useEffect(() => {
    if (activeTab === "history" && histories.length === 0 && employeeId) {
      fetchHistory();
    }
  }, [activeTab, histories.length, employeeId, fetchHistory]);

  return (
    <Dialog open={!!employeeId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.employeeDetails}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {employee && !loading && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {employee.name}
                </h2>
                {employee.nameKana && (
                  <p className="text-sm text-muted-foreground">
                    {employee.nameKana}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={cn(
                      "text-xs",
                      getPositionColor(employee.position),
                    )}
                  >
                    {employee.position}
                  </Badge>
                  <Badge
                    variant={employee.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {employee.isActive ? t.active : t.inactive}
                  </Badge>
                </div>
              </div>
            </div>

            {/* タブ */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">
                  {language === "ja" ? "基本情報" : "Basic Info"}
                </TabsTrigger>
                <TabsTrigger value="history">
                  {language === "ja" ? "キャリア履歴" : "Career History"}
                </TabsTrigger>
              </TabsList>

              {/* 基本情報タブ */}
              <TabsContent value="basic" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[calc(60vh-200px)]">
                  <div className="space-y-6 pr-4">
                    {/* 基本情報 */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        {t.basicInfo}
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">
                          {t.employeeId}
                        </dt>
                        <dd className="text-foreground">
                          {employee.employeeId}
                        </dd>

                        {employee.qualificationGrade && (
                          <>
                            <dt className="text-muted-foreground">
                              {t.qualificationGrade}
                            </dt>
                            <dd className="text-foreground">
                              {employee.qualificationGrade}
                            </dd>
                          </>
                        )}

                        {employee.employmentType && (
                          <>
                            <dt className="text-muted-foreground">
                              {t.employmentType}
                            </dt>
                            <dd className="text-foreground">
                              {employee.employmentType}
                            </dd>
                          </>
                        )}
                      </dl>
                    </div>

                    <Separator />

                    {/* 所属情報 */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        {t.affiliation}
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {employee.department && (
                          <>
                            <dt className="text-muted-foreground">
                              {t.department}
                            </dt>
                            <dd className="text-foreground">
                              <div>{employee.department.name}</div>
                              {employee.department.manager && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  {employee.department.manager.name}
                                  <span className="opacity-70">
                                    ({employee.department.manager.position})
                                  </span>
                                </div>
                              )}
                            </dd>
                          </>
                        )}

                        {employee.section && (
                          <>
                            <dt className="text-muted-foreground">
                              {t.section}
                            </dt>
                            <dd className="text-foreground">
                              <div>{employee.section.name}</div>
                              {employee.section.manager && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  {employee.section.manager.name}
                                  <span className="opacity-70">
                                    ({employee.section.manager.position})
                                  </span>
                                </div>
                              )}
                            </dd>
                          </>
                        )}

                        {employee.course && (
                          <>
                            <dt className="text-muted-foreground">
                              {t.course}
                            </dt>
                            <dd className="text-foreground">
                              <div>{employee.course.name}</div>
                              {employee.course.manager && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  {employee.course.manager.name}
                                  <span className="opacity-70">
                                    ({employee.course.manager.position})
                                  </span>
                                </div>
                              )}
                            </dd>
                          </>
                        )}
                      </dl>
                    </div>

                    <Separator />

                    {/* 連絡先情報 */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        {t.contactInfo}
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">{t.email}</dt>
                        <dd className="text-foreground">
                          {employee.email ? (
                            <a
                              href={`mailto:${employee.email}`}
                              className="text-primary hover:underline"
                            >
                              {employee.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </dd>

                        <dt className="text-muted-foreground">{t.phone}</dt>
                        <dd className="text-foreground">
                          {employee.phone ? (
                            <a
                              href={`tel:${employee.phone}`}
                              className="text-primary hover:underline"
                            >
                              {employee.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </dd>
                      </dl>
                    </div>

                    <Separator />

                    {/* その他情報 */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        {t.otherInfo}
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">{t.joinDate}</dt>
                        <dd className="text-foreground">
                          {formatDate(employee.joinDate, language)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* キャリア履歴タブ */}
              <TabsContent value="history" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[calc(60vh-200px)]">
                  <div className="pr-4">
                    {historyLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    )}

                    {!historyLoading && histories.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {language === "ja"
                          ? "履歴データがありません"
                          : "No history data"}
                      </div>
                    )}

                    {!historyLoading && histories.length > 0 && (
                      <div className="relative">
                        {/* タイムライン */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                        <div className="space-y-4">
                          {histories.map((history, index) => (
                            <div key={history.id} className="relative pl-10">
                              {/* タイムラインドット */}
                              <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={getChangeTypeIcon(history.changeType)}
                                  />
                                </svg>
                              </div>

                              {/* カード */}
                              <div className="bg-muted/50 rounded-lg p-4 border">
                                {/* ヘッダー */}
                                <div className="flex items-center justify-between mb-2">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      getChangeTypeColor(history.changeType),
                                    )}
                                  >
                                    {history.changeTypeJa}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatShortDate(
                                      history.validFrom,
                                      language,
                                    )}
                                  </span>
                                </div>

                                {/* 内容 */}
                                <div className="space-y-2 text-sm">
                                  {/* 所属情報 */}
                                  <div className="text-foreground">
                                    <span className="font-medium">
                                      {history.department}
                                    </span>
                                    {history.section && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        / {history.section}
                                      </span>
                                    )}
                                    {history.course && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        / {history.course}
                                      </span>
                                    )}
                                  </div>

                                  {/* 役職 */}
                                  <div className="text-muted-foreground">
                                    {language === "ja" ? "役職" : "Position"}:{" "}
                                    {history.position}
                                  </div>

                                  {/* 変更詳細 */}
                                  {history.changes.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs text-muted-foreground mb-1">
                                        {language === "ja"
                                          ? "変更内容:"
                                          : "Changes:"}
                                      </p>
                                      <ul className="space-y-1">
                                        {history.changes
                                          .slice(0, 3)
                                          .map((change, i) => (
                                            <li
                                              key={i}
                                              className="text-xs text-muted-foreground"
                                            >
                                              {change.description}
                                            </li>
                                          ))}
                                        {history.changes.length > 3 && (
                                          <li className="text-xs text-muted-foreground">
                                            ...
                                            {language === "ja"
                                              ? `他${history.changes.length - 3}件`
                                              : `and ${history.changes.length - 3} more`}
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                  {/* 理由 */}
                                  {history.changeReason && (
                                    <p className="text-xs text-muted-foreground italic">
                                      {history.changeReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* 閉じるボタン */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                {t.close}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
