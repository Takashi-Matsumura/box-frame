"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Play, RefreshCw, Trash2, CheckCircle, Undo2, Lock } from "lucide-react";
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    term: "H1",
    startDate: "",
    endDate: "",
  });

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
        setFormData({
          name: "",
          year: new Date().getFullYear(),
          term: "H1",
          startDate: "",
          endDate: "",
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

      if (res.ok) {
        fetchPeriods();
        alert(t.generateSuccess);
      }
    } catch (error) {
      console.error("Failed to generate evaluations:", error);
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
    if (!confirm(t.confirmDelete)) return;

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-muted text-muted-foreground",
      ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
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
    return <div className="text-center py-8 text-muted-foreground">{t.loading}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t.periodsTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.periodsDescription}</p>
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
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.term}</Label>
                  <Select
                    value={formData.term}
                    onValueChange={(value) =>
                      setFormData({ ...formData, term: value })
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
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

      {periods.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noPeriods}
        </div>
      ) : (
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
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.advanceToReview}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmAdvanceToReview}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(period.id, "REVIEW")}
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
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.revertToDraft}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmRevertToDraft}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(period.id, "DRAFT")}
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
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.advanceToClosed}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmAdvanceToClosed}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(period.id, "CLOSED")}
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
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.revertToActive}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmRevertToActive}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(period.id, "ACTIVE")}
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
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.revertToReview}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.confirmRevertToReview}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusChange(period.id, "REVIEW")}
                            >
                              {t.revertToReview}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* 削除ボタン（評価が0件の場合のみ） */}
                    {period._count.evaluations === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(period.id);
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
  );
}
