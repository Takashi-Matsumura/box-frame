"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Edit3,
  Languages,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Holiday {
  id: string;
  date: string;
  name: string;
  nameEn?: string;
  type: string;
  description?: string;
}

interface HolidayManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "en" | "ja";
}

function t(en: string, ja: string, language: "en" | "ja"): string {
  return language === "ja" ? ja : en;
}

export function HolidayManagerDialog({
  open,
  onOpenChange,
  language,
}: HolidayManagerDialogProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Edit/Create dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    nameEn: "",
    type: "national",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch holidays for selected year
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const res = await fetch(
        `/api/calendar/holidays?startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (open) {
      fetchHolidays();
    }
  }, [open, fetchHolidays]);

  // Open create dialog
  const handleCreate = useCallback(() => {
    setEditingHoliday(null);
    setFormData({
      date: `${selectedYear}-01-01`,
      name: "",
      nameEn: "",
      type: "national",
      description: "",
    });
    setEditDialogOpen(true);
  }, [selectedYear]);

  // Open edit dialog
  const handleEdit = useCallback((holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      nameEn: holiday.nameEn || "",
      type: holiday.type,
      description: holiday.description || "",
    });
    setEditDialogOpen(true);
  }, []);

  // Save holiday (create or update)
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const url = editingHoliday
        ? `/api/calendar/holidays/${editingHoliday.id}`
        : "/api/calendar/holidays";
      const method = editingHoliday ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        fetchHolidays();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save holiday");
      }
    } catch (error) {
      console.error("Failed to save holiday:", error);
    } finally {
      setSaving(false);
    }
  }, [editingHoliday, formData, fetchHolidays]);

  // Translate Japanese name to English using AI
  const handleTranslate = useCallback(async () => {
    if (!formData.name.trim()) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: formData.name,
          sourceLanguage: "ja",
          targetLanguage: "en",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setFormData((prev) => ({ ...prev, nameEn: data.translatedText }));
        }
      } else {
        const data = await res.json();
        console.error("Translation error:", data.error);
      }
    } catch (error) {
      console.error("Failed to translate:", error);
    } finally {
      setTranslating(false);
    }
  }, [formData.name]);

  // Delete holiday
  const handleDelete = useCallback(
    async (holiday: Holiday) => {
      if (
        !confirm(
          t(
            `Delete "${holiday.name}"?`,
            `「${holiday.name}」を削除しますか？`,
            language
          )
        )
      ) {
        return;
      }

      try {
        const res = await fetch(`/api/calendar/holidays/${holiday.id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          fetchHolidays();
        }
      } catch (error) {
        console.error("Failed to delete holiday:", error);
      }
    },
    [language, fetchHolidays]
  );

  // Auto-generate holidays using AI
  const handleGenerateHolidays = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/calendar/holidays/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear }),
      });

      if (res.ok) {
        fetchHolidays();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate holidays");
      }
    } catch (error) {
      console.error("Failed to generate holidays:", error);
    } finally {
      setGenerating(false);
    }
  }, [selectedYear, fetchHolidays]);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("Holiday Management", "祝日管理", language)}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-muted-foreground">{t("Year", "年", language)}</Label>
            </div>
            <div className="flex items-center gap-2">
              {holidays.length === 0 && !loading && (
                <Button
                  onClick={handleGenerateHolidays}
                  size="sm"
                  variant="outline"
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-1" />
                  )}
                  {generating
                    ? t("Generating...", "生成中...", language)
                    : t("Auto-generate", "祝日自動生成", language)}
                </Button>
              )}
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("Add Holiday", "祝日を追加", language)}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t(
                  "No holidays registered for this year.",
                  "この年の祝日は登録されていません。",
                  language
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">
                      {t("Date", "日付", language)}
                    </TableHead>
                    <TableHead>{t("Name", "名称", language)}</TableHead>
                    <TableHead className="w-[100px]">
                      {t("Type", "種別", language)}
                    </TableHead>
                    <TableHead className="w-[100px] text-right">
                      {t("Actions", "操作", language)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-mono">{holiday.date}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{holiday.name}</span>
                          {holiday.nameEn && (
                            <span className="text-muted-foreground text-xs">
                              {holiday.nameEn}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            holiday.type === "national" ? "default" : "secondary"
                          }
                        >
                          {holiday.type === "national"
                            ? t("National", "国の祝日", language)
                            : t("Company", "会社休日", language)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holiday)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday
                ? t("Edit Holiday", "祝日を編集", language)
                : t("Add Holiday", "祝日を追加", language)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">{t("Date", "日付", language)}</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                {t("Name (Japanese)", "名称（日本語）", language)}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("e.g. New Year's Day", "例: 元日", language)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">
                {t("Name (English)", "名称（英語）", language)}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
                    }
                    placeholder={
                      translating
                        ? t("Translating...", "翻訳中...", language)
                        : "e.g. New Year's Day"
                    }
                    disabled={translating}
                  />
                  {translating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleTranslate}
                  disabled={translating || !formData.name.trim()}
                  title={t("AI Translate", "AI翻訳", language)}
                >
                  {translating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Type", "種別", language)}</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">
                    {t("National Holiday", "国の祝日", language)}
                  </SelectItem>
                  <SelectItem value="company">
                    {t("Company Holiday", "会社休日", language)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("Description (Optional)", "説明（任意）", language)}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              {t("Cancel", "キャンセル", language)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.date || !formData.name}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("Save", "保存", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
