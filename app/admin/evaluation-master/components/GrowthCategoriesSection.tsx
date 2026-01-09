"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, GripVertical, Languages, Loader2 } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
  scoreT1: number;
  scoreT2: number;
  scoreT3: number;
  scoreT4: number;
  sortOrder: number;
  isActive: boolean;
}

interface GrowthCategoriesSectionProps {
  language: "en" | "ja";
}

export default function GrowthCategoriesSection({
  language,
}: GrowthCategoriesSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [categories, setCategories] = useState<GrowthCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GrowthCategory | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    description: "",
    coefficient: 1.0,
    scoreT1: 0.5,
    scoreT2: 1.0,
    scoreT3: 1.5,
    scoreT4: 2.0,
    sortOrder: 0,
    isActive: true,
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluation/growth-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch growth categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      description: "",
      coefficient: 1.0,
      scoreT1: 0.5,
      scoreT2: 1.0,
      scoreT3: 1.5,
      scoreT4: 2.0,
      sortOrder: categories.length + 1,
      isActive: true,
    });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: GrowthCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameEn: category.nameEn || "",
        description: category.description || "",
        coefficient: category.coefficient ?? 1.0,
        scoreT1: category.scoreT1 ?? 0.5,
        scoreT2: category.scoreT2 ?? 1.0,
        scoreT3: category.scoreT3 ?? 1.5,
        scoreT4: category.scoreT4 ?? 2.0,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    } else {
      resetForm();
      setFormData((prev) => ({ ...prev, sortOrder: categories.length + 1 }));
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
        ? `/api/evaluation/growth-categories/${editingCategory.id}`
        : "/api/evaluation/growth-categories";

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
      console.error("Failed to save growth category:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/evaluation/growth-categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to delete growth category:", error);
    }
  };

  const handleToggleActive = async (category: GrowthCategory) => {
    try {
      const res = await fetch(`/api/evaluation/growth-categories/${category.id}`, {
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
            {t.growthCategoriesTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.growthCategoriesDescription}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addCategory}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t.edit : t.addCategory}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t.categoryName}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="資格取得"
                />
              </div>
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
                  placeholder="Certification"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="成長カテゴリの説明..."
                  rows={3}
                />
              </div>
              {/* 係数（難易度調整） */}
              <div className="space-y-2">
                <Label>
                  {language === "ja" ? "係数（難易度調整）" : "Coefficient (Difficulty Adjustment)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "ja"
                    ? "最終スコア = 達成度スコア × 係数。カテゴリごとの難易度差を調整できます。"
                    : "Final Score = Achievement Score × Coefficient. Adjusts for difficulty differences between categories."}
                </p>
                <Input
                  type="number"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={formData.coefficient}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coefficient: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-32"
                />
              </div>

              {/* 達成度別スコア */}
              <div className="space-y-2">
                <Label>{t.achievementLevelScores}</Label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t.scoreT4} ({t.t4Description})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={formData.scoreT4}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scoreT4: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t.scoreT3} ({t.t3Description})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={formData.scoreT3}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scoreT3: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t.scoreT2} ({t.t2Description})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={formData.scoreT2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scoreT2: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t.scoreT1} ({t.t1Description})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={formData.scoreT1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scoreT1: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.sortOrder}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.isActive}</Label>
                  <div className="pt-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>
                </div>
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
                <TableHead className="w-12"></TableHead>
                <TableHead>{t.sortOrder}</TableHead>
                <TableHead>{t.categoryName}</TableHead>
                <TableHead className="text-center">{language === "ja" ? "係数" : "Coef."}</TableHead>
                <TableHead className="text-center">{t.scoreT4}</TableHead>
                <TableHead className="text-center">{t.scoreT3}</TableHead>
                <TableHead className="text-center bg-blue-50 dark:bg-blue-900/20">
                  {t.scoreT2}
                  <span className="block text-[10px] font-normal text-blue-600 dark:text-blue-400">
                    ({language === "ja" ? "標準" : "Std"})
                  </span>
                </TableHead>
                <TableHead className="text-center">{t.scoreT1}</TableHead>
                <TableHead>{t.description}</TableHead>
                <TableHead>{t.isActive}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                      ×{(category.coefficient ?? 1.0).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{(category.scoreT4 ?? 2.0).toFixed(1)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{(category.scoreT3 ?? 1.5).toFixed(1)}</span>
                  </TableCell>
                  <TableCell className="text-center bg-blue-50 dark:bg-blue-900/20">
                    <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {(category.scoreT2 ?? 1.0).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{(category.scoreT1 ?? 0.5).toFixed(1)}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => handleToggleActive(category)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
