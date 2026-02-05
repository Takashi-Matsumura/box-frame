"use client";

import {
  CheckCircle,
  Lock,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { evaluationMasterTranslations } from "../translations";

interface Period {
  id: string;
  name: string;
  year: number;
  term: string;
  status: string;
  startDate: string;
  endDate: string;
  _count: { evaluations: number };
}

interface PeriodsSectionProps {
  language: "en" | "ja";
  onPeriodSelect: (periodId: string | null) => void;
}

export default function PeriodsSection({
  language,
  onPeriodSelect,
}: PeriodsSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetDialogPeriodId, setResetDialogPeriodId] = useState<string | null>(
    null,
  );
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [deleteDialogPeriodId, setDeleteDialogPeriodId] = useState<
    string | null
  >(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 年度・期から開始日・終了日・期間名を算出
  const computePeriodDefaults = useCallback(
    (year: number, term: string) => {
      const termLabel =
        term === "H1"
          ? language === "ja"
            ? "上期"
            : "H1"
          : term === "H2"
            ? language === "ja"
              ? "下期"
              : "H2"
            : language === "ja"
              ? "通期"
              : "Annual";
      const name = `${year}${language === "ja" ? "年度" : ""}　${termLabel}`;

      let startDate: string;
      let endDate: string;
      if (term === "H1") {
        startDate = `${year}-04-01`;
        endDate = `${year}-09-30`;
      } else if (term === "H2") {
        startDate = `${year}-10-01`;
        endDate = `${year + 1}-03-31`;
      } else {
        // ANNUAL
        startDate = `${year}-04-01`;
        endDate = `${year + 1}-03-31`;
      }
      return { name, startDate, endDate };
    },
    [language],
  );

  // 現在の日付から年度・期を自動判定
  const getCurrentFiscalPeriod = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    // 4月始まりの年度: 1-3月は前年度
    const fiscalYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    // 4-9月: 上期, 10-3月: 下期
    const term = month >= 4 && month <= 9 ? "H1" : "H2";
    return { fiscalYear, term };
  }, []);

  // Form state - 現在の日付から初期値を自動設定
  const [formData, setFormData] = useState(() => {
    const { fiscalYear, term } = getCurrentFiscalPeriod();
    const defaults = computePeriodDefaults(fiscalYear, term);
    return {
      name: defaults.name,
      year: fiscalYear,
      term,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
    };
  });

  // 年度・期が変更されたら開始日・終了日・期間名を連動更新
  const updateFormWithDefaults = useCallback(
    (year: number, term: string) => {
      const defaults = computePeriodDefaults(year, term);
      setFormData((prev) => ({
        ...prev,
        year,
        term,
        ...defaults,
      }));
    },
    [computePeriodDefaults],
  );

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluation/periods");
      if (res.ok) {
        const data = await res.json();
        setPeriods(data);
        if (data.length > 0) {
          onPeriodSelect(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch periods:", error);
    } finally {
      setLoading(false);
    }
  }, [onPeriodSelect]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreate = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) return;

    setCreating(true);
    try {
      const res = await fetch("/api/evaluation/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        const { fiscalYear, term } = getCurrentFiscalPeriod();
        const defaults = computePeriodDefaults(fiscalYear, term);
        setFormData({
          name: defaults.name,
          year: fiscalYear,
          term,
          startDate: defaults.startDate,
          endDate: defaults.endDate,
        });
        fetchPeriods();
      }
    } catch (error) {
      console.error("Failed to create period:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (periodId: string) => {
    setGenerating(periodId);
    try {
      const res = await fetch(`/api/evaluation/periods/${periodId}/generate`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        fetchPeriods();
        const generated = data.data?.generatedCount || 0;
        const skipped = data.data?.skippedCount || 0;
        const total = data.data?.totalEmployees || 0;
        alert(
          `${t.generateSuccess}\n${language === "ja" ? `対象: ${total}名 / 生成: ${generated}名 / スキップ: ${skipped}名` : `Total: ${total} / Generated: ${generated} / Skipped: ${skipped}`}`,
        );
      } else {
        alert(data.error || "Failed to generate evaluations");
      }
    } catch (error) {
      console.error("Failed to generate evaluations:", error);
      alert("Failed to generate evaluations");
    } finally {
      setGenerating(null);
    }
  };

  const handleStatusChange = async (periodId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/evaluation/periods/${periodId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchPeriods();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (periodId: string) => {
    try {
      const res = await fetch(`/api/evaluation/periods/${periodId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPeriods();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to delete period:", error);
    }
  };

  const handleReset = async (periodId: string) => {
    setResetting(periodId);
    try {
      const res = await fetch(`/api/evaluation/periods/${periodId}/reset`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        fetchPeriods();
        alert(
          `${t.resetSuccess}\n${language === "ja" ? `削除件数: ${data.deletedCount}件` : `Deleted: ${data.deletedCount}`}`,
        );
      } else {
        alert(data.error || "Failed to reset evaluations");
      }
    } catch (error) {
      console.error("Failed to reset evaluations:", error);
      alert("Failed to reset evaluations");
    } finally {
      setResetting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-muted text-muted-foreground",
      ACTIVE:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      REVIEW:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      CLOSED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    const labels: Record<string, string> = {
      DRAFT: t.statusDraft,
      ACTIVE: t.statusActive,
      REVIEW: t.statusReview,
      CLOSED: t.statusClosed,
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getTermLabel = (term: string) => {
    const labels: Record<string, string> = {
      H1: t.termH1,
      H2: t.termH2,
      ANNUAL: t.termAnnual,
    };
    return labels[term] || term;
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.periodName}</TableHead>
                <TableHead>{t.year}</TableHead>
                <TableHead>{t.term}</TableHead>
                <TableHead>{t.startDate}</TableHead>
                <TableHead>{t.endDate}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.evaluationCount}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.periodsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.periodsDescription}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t.createPeriod}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.createPeriod}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t.periodName}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="2024年度 上期評価"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.year}</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      if (!isNaN(year)) {
                        updateFormWithDefaults(year, formData.term);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.term}</Label>
                  <Select
                    value={formData.term}
                    onValueChange={(value) =>
                      updateFormWithDefaults(formData.year, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="H1">{t.termH1}</SelectItem>
                      <SelectItem value="H2">{t.termH2}</SelectItem>
                      <SelectItem value="ANNUAL">{t.termAnnual}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.endDate}</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? t.loading : t.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto">
        {periods.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.noPeriods}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>{t.periodName}</TableHead>
                <TableHead>{t.year}</TableHead>
                <TableHead>{t.term}</TableHead>
                <TableHead>{t.startDate}</TableHead>
                <TableHead>{t.endDate}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.evaluationCount}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow
                  key={period.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onPeriodSelect(period.id)}
                >
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>{period.year}</TableCell>
                  <TableCell>{getTermLabel(period.term)}</TableCell>
                  <TableCell>
                    {new Date(period.startDate).toLocaleDateString(language)}
                  </TableCell>
                  <TableCell>
                    {new Date(period.endDate).toLocaleDateString(language)}
                  </TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                  <TableCell>{period._count.evaluations}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* DRAFT状態: 生成ボタンと開始ボタン */}
                      {period.status === "DRAFT" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerate(period.id);
                            }}
                            disabled={generating === period.id}
                            title={t.generateEvaluations}
                          >
                            {generating === period.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          {period._count.evaluations > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(period.id, "ACTIVE");
                              }}
                              title={t.statusActive}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}

                      {/* ACTIVE状態: レビュー開始ボタンと戻すボタン */}
                      {period.status === "ACTIVE" && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                title={t.advanceToReview}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.advanceToReview}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmAdvanceToReview}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleStatusChange(period.id, "REVIEW")
                                  }
                                >
                                  {t.advanceToReview}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                title={t.revertToDraft}
                              >
                                <Undo2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.revertToDraft}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmRevertToDraft}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleStatusChange(period.id, "DRAFT")
                                  }
                                >
                                  {t.revertToDraft}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {/* REVIEW状態: 完了ボタンと戻すボタン */}
                      {period.status === "REVIEW" && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                title={t.advanceToClosed}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.advanceToClosed}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmAdvanceToClosed}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleStatusChange(period.id, "CLOSED")
                                  }
                                >
                                  {t.advanceToClosed}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                title={t.revertToActive}
                              >
                                <Undo2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.revertToActive}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmRevertToActive}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleStatusChange(period.id, "ACTIVE")
                                  }
                                >
                                  {t.revertToActive}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {/* CLOSED状態: 戻すボタンのみ */}
                      {period.status === "CLOSED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              title={t.revertToReview}
                            >
                              <Undo2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t.revertToReview}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmRevertToReview}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleStatusChange(period.id, "REVIEW")
                                }
                              >
                                {t.revertToReview}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* リセットボタン（評価データがある場合） */}
                      {period._count.evaluations > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetConfirmText("");
                            setResetDialogPeriodId(period.id);
                          }}
                          disabled={resetting === period.id}
                          title={t.resetEvaluations}
                        >
                          {resetting === period.id ? (
                            <RotateCcw className="w-4 h-4 text-destructive animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      )}

                      {/* 削除ボタン（評価が0件の場合のみ） */}
                      {period._count.evaluations === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmText("");
                            setDeleteDialogPeriodId(period.id);
                          }}
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* リセット確認ダイアログ */}
      <Dialog
        open={resetDialogPeriodId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetDialogPeriodId(null);
            setResetConfirmText("");
          }
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t.resetEvaluations}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.confirmReset}</p>
            <div>
              <Label className="text-sm">
                {t.resetConfirmLabel}
              </Label>
              <Input
                className="mt-2"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetDialogPeriodId(null);
                  setResetConfirmText("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={
                  resetConfirmText !== "RESET" ||
                  resetting === resetDialogPeriodId
                }
                onClick={() => {
                  if (resetDialogPeriodId) {
                    handleReset(resetDialogPeriodId);
                    setResetDialogPeriodId(null);
                    setResetConfirmText("");
                  }
                }}
              >
                {resetting === resetDialogPeriodId
                  ? t.loading
                  : t.resetEvaluations}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogPeriodId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogPeriodId(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t.deletePeriod}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.confirmDeleteDescription}
            </p>
            <div>
              <Label className="text-sm">{t.deleteConfirmLabel}</Label>
              <Input
                className="mt-2"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogPeriodId(null);
                  setDeleteConfirmText("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => {
                  if (deleteDialogPeriodId) {
                    handleDelete(deleteDialogPeriodId);
                    setDeleteDialogPeriodId(null);
                    setDeleteConfirmText("");
                  }
                }}
              >
                {t.deletePeriod}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
