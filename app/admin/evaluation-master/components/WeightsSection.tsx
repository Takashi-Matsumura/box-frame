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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface Weight {
  id: string;
  gradeCode: string;
  resultsWeight: number;
  processWeight: number;
  growthWeight: number;
}

interface Period {
  id: string;
  name: string;
}

interface WeightsSectionProps {
  language: "en" | "ja";
  selectedPeriodId: string | null;
}

export default function WeightsSection({
  language,
  selectedPeriodId,
}: WeightsSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [periods, setPeriods] = useState<Period[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodId, setPeriodId] = useState<string>(selectedPeriodId || "");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    gradeCode: "",
    resultsWeight: 30,
    processWeight: 40,
    growthWeight: 30,
  });

  // Fetch periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/evaluation/periods");
        if (res.ok) {
          const data = await res.json();
          setPeriods(data);
          if (data.length > 0 && !periodId) {
            setPeriodId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch periods:", error);
      }
    };
    fetchPeriods();
  }, [periodId]);

  const fetchWeights = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluation/weights?periodId=${periodId}`);
      if (res.ok) {
        const data = await res.json();
        setWeights(data);
      }
    } catch (error) {
      console.error("Failed to fetch weights:", error);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    fetchWeights();
  }, [fetchWeights]);

  useEffect(() => {
    if (selectedPeriodId) {
      setPeriodId(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const handleSave = async () => {
    const total = formData.resultsWeight + formData.processWeight + formData.growthWeight;
    if (total !== 100) {
      alert(t.weightError);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          ...formData,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          gradeCode: "",
          resultsWeight: 30,
          processWeight: 40,
          growthWeight: 30,
        });
        fetchWeights();
      }
    } catch (error) {
      console.error("Failed to save weight:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (weight: Weight) => {
    const total = weight.resultsWeight + weight.processWeight + weight.growthWeight;
    if (total !== 100) {
      alert(t.weightError);
      return;
    }

    try {
      await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          gradeCode: weight.gradeCode,
          resultsWeight: weight.resultsWeight,
          processWeight: weight.processWeight,
          growthWeight: weight.growthWeight,
        }),
      });
      fetchWeights();
    } catch (error) {
      console.error("Failed to update weight:", error);
    }
  };

  const handleWeightChange = (index: number, field: keyof Weight, value: number) => {
    const updated = [...weights];
    updated[index] = { ...updated[index], [field]: value };
    setWeights(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t.weightsTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.weightsDescription}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t.selectPeriod} />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={!periodId}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addWeight}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.addWeight}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.gradeCode}</Label>
                  <Input
                    value={formData.gradeCode}
                    onChange={(e) =>
                      setFormData({ ...formData, gradeCode: e.target.value.toUpperCase() })
                    }
                    placeholder="G1, G2, G3..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.resultsWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.resultsWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resultsWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.processWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.processWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          processWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.growthWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.growthWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          growthWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.total}:{" "}
                  {formData.resultsWeight + formData.processWeight + formData.growthWeight}%
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
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
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
      ) : !periodId ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.selectPeriod}
        </div>
      ) : weights.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.noData}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.gradeCode}</TableHead>
              <TableHead>{t.resultsWeight} (%)</TableHead>
              <TableHead>{t.processWeight} (%)</TableHead>
              <TableHead>{t.growthWeight} (%)</TableHead>
              <TableHead>{t.total}</TableHead>
              <TableHead>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weights.map((weight, index) => (
              <TableRow key={weight.id}>
                <TableCell className="font-medium">
                  {weight.gradeCode === "DEFAULT" ? t.defaultWeight : weight.gradeCode}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20"
                    value={weight.resultsWeight}
                    onChange={(e) =>
                      handleWeightChange(index, "resultsWeight", parseInt(e.target.value) || 0)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20"
                    value={weight.processWeight}
                    onChange={(e) =>
                      handleWeightChange(index, "processWeight", parseInt(e.target.value) || 0)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20"
                    value={weight.growthWeight}
                    onChange={(e) =>
                      handleWeightChange(index, "growthWeight", parseInt(e.target.value) || 0)
                    }
                  />
                </TableCell>
                <TableCell>
                  {weight.resultsWeight + weight.processWeight + weight.growthWeight}%
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdate(weight)}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
