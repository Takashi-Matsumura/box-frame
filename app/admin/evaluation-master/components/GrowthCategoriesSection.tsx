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
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
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
  const [editingCategory, setEditingCategory] = useState<GrowthCategory | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    description: "",
    coefficient: 1.0,
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
        coefficient: category.coefficient,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    } else {
      resetForm();
      setFormData((prev) => ({ ...prev, sortOrder: categories.length + 1 }));
    }
    setIsDialogOpen(true);
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
    <div>
      <div className="flex items-center justify-between mb-6">
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
                <Label>{t.categoryNameEn}</Label>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.coefficient}</Label>
                  <Input
                    type="number"
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    value={formData.coefficient}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coefficient: parseFloat(e.target.value) || 1.0,
                      })
                    }
                  />
                </div>
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

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.noData}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>{t.sortOrder}</TableHead>
              <TableHead>{t.categoryName}</TableHead>
              <TableHead>{t.categoryNameEn}</TableHead>
              <TableHead>{t.coefficient}</TableHead>
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
                <TableCell className="text-muted-foreground">
                  {category.nameEn || "-"}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">×{category.coefficient.toFixed(1)}</span>
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
  );
}
