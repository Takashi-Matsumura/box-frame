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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Languages, Loader2, GripVertical } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface ProcessCategory {
  id: string;
  name: string;
  nameEn: string | null;
  categoryCode: string;
  description: string | null;
  minItemCount: number;
  scores: string;
  sortOrder: number;
  isActive: boolean;
}

interface ProcessCategoriesSectionProps {
  language: "en" | "ja";
}

interface CategoryFormData {
  name: string;
  nameEn: string;
  categoryCode: string;
  description: string;
  minItemCount: number;
  isActive: boolean;
  scores: {
    T4: number;
    T3: number;
    T2: number;
    T1: number;
  };
}

export default function ProcessCategoriesSection({
  language,
}: ProcessCategoriesSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [categories, setCategories] = useState<ProcessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProcessCategory | null>(null);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    nameEn: "",
    categoryCode: "A",
    description: "",
    minItemCount: 2,
    isActive: true,
    scores: { T4: 110, T3: 100, T2: 80, T1: 60 },
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluation/process-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch process categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const parseScores = (scoresJson: string) => {
    try {
      return JSON.parse(scoresJson);
    } catch {
      return { T4: 110, T3: 100, T2: 80, T1: 60 };
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      categoryCode: "A",
      description: "",
      minItemCount: 2,
      isActive: true,
      scores: { T4: 110, T3: 100, T2: 80, T1: 60 },
    });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: ProcessCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameEn: category.nameEn || "",
        categoryCode: category.categoryCode || "A",
        description: category.description || "",
        minItemCount: category.minItemCount ?? 0,
        isActive: category.isActive ?? true,
        scores: parseScores(category.scores),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleTranslate = async () => {
    if (!formData.name) return;

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
          setFormData({ ...formData, nameEn: data.translatedText });
        }
      }
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;

    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/evaluation/process-categories/${editingCategory.id}`
        : "/api/evaluation/process-categories";

      const res = await fetch(url, {
        method: editingCategory ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to save process category:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/evaluation/process-categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to delete process category:", error);
    }
  };

  const handleToggleActive = async (category: ProcessCategory) => {
    try {
      const res = await fetch(`/api/evaluation/process-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (res.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to toggle category:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t.loading}</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.processCategoriesTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.processCategoriesDescription}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addCategory}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t.edit : t.addCategory}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* カテゴリー名 */}
              <div className="space-y-2">
                <Label>{t.categoryName}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={language === "ja" ? "例：Aクラスプロセス" : "e.g., A Class Process"}
                />
              </div>

              {/* 英語名 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t.categoryNameEn}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={!formData.name || translating}
                    className="h-6 px-2 text-xs"
                  >
                    {translating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3 mr-1" />
                    )}
                    AI翻訳
                  </Button>
                </div>
                <Input
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  placeholder="e.g., A Class Process"
                />
              </div>

              {/* 説明 */}
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={language === "ja" ? "カテゴリーの説明を入力" : "Enter category description"}
                  rows={2}
                />
              </div>

              {/* クラスと最小選択項目数 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.categoryClass}</Label>
                  <Select
                    value={formData.categoryCode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryCode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">{t.classA}</SelectItem>
                      <SelectItem value="B">{t.classB}</SelectItem>
                      <SelectItem value="C">{t.classC}</SelectItem>
                      <SelectItem value="D">{t.classD}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.minItemCount}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={formData.minItemCount ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minItemCount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.minItemCountHint}
                  </p>
                </div>
              </div>

              {/* 達成度別スコア */}
              <div className="space-y-2">
                <Label>{t.tierScores}</Label>
                <div className="grid grid-cols-4 gap-3">
                  {(["T4", "T3", "T2", "T1"] as const).map((tier) => (
                    <div key={tier} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{tier}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.scores?.[tier] ?? 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            scores: {
                              ...formData.scores,
                              [tier]: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 有効/無効 */}
              <div className="flex items-center gap-3">
                <Label>{t.isActive}</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t.loading : t.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t.noData}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-16">{t.sortOrder}</TableHead>
                <TableHead>{t.categoryName}</TableHead>
                <TableHead className="w-20 text-center">{t.categoryClass}</TableHead>
                <TableHead className="w-20 text-center">{t.minItemCount}</TableHead>
                <TableHead className="w-16 text-center">{t.scoreT4}</TableHead>
                <TableHead className="w-16 text-center">{t.scoreT3}</TableHead>
                <TableHead className="w-20 text-center bg-blue-50 dark:bg-blue-900/20">
                  {t.scoreT2}
                  <span className="block text-[10px] font-normal text-blue-600 dark:text-blue-400">
                    ({language === "ja" ? "標準" : "Std"})
                  </span>
                </TableHead>
                <TableHead className="w-16 text-center">{t.scoreT1}</TableHead>
                <TableHead>{t.description}</TableHead>
                <TableHead className="w-20">{t.isActive}</TableHead>
                <TableHead className="w-24">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const scores = parseScores(category.scores);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="text-center">{category.sortOrder}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{category.categoryCode}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">{category.minItemCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">{scores.T4 || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">{scores.T3 || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center bg-blue-50 dark:bg-blue-900/20">
                      <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {scores.T2 || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">{scores.T1 || "-"}</span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.isActive}
                        onCheckedChange={() => handleToggleActive(category)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
