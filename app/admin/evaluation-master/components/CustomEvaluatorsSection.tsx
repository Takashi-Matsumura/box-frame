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
import { Plus, Trash2, UserCheck } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
}

interface CustomEvaluator {
  id: string;
  employeeId: string;
  evaluatorId: string;
  periodId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  employee: Employee;
  evaluator: Employee;
  period: { id: string; name: string } | null;
}

interface Period {
  id: string;
  name: string;
}

interface CustomEvaluatorsSectionProps {
  language: "en" | "ja";
  selectedPeriodId: string | null;
}

export default function CustomEvaluatorsSection({
  language,
  selectedPeriodId,
}: CustomEvaluatorsSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [customEvaluators, setCustomEvaluators] = useState<CustomEvaluator[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    evaluatorId: "",
    periodId: "__all__",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [evaluatorSearch, setEvaluatorSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [customRes, employeesRes, periodsRes] = await Promise.all([
        fetch("/api/evaluation/custom-evaluators"),
        fetch("/api/organization/employees?limit=1000"),
        fetch("/api/evaluation/periods"),
      ]);

      if (customRes.ok) {
        const data = await customRes.json();
        setCustomEvaluators(data);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || data);
      }

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      employeeId: "",
      evaluatorId: "",
      periodId: selectedPeriodId || "__all__",
      effectiveFrom: "",
      effectiveTo: "",
    });
    setEmployeeSearch("");
    setEvaluatorSearch("");
  };

  const handleSave = async () => {
    if (!formData.employeeId || !formData.evaluatorId) return;

    if (formData.employeeId === formData.evaluatorId) {
      alert(language === "ja" ? "被評価者と評価者は同一人物にできません" : "Employee and evaluator cannot be the same person");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/custom-evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          periodId: formData.periodId === "__all__" ? null : formData.periodId || null,
          effectiveFrom: formData.effectiveFrom || null,
          effectiveTo: formData.effectiveTo || null,
        }),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to save custom evaluator:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/evaluation/custom-evaluators/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to delete custom evaluator:", error);
    }
  };

  const getEmployeeName = (employee: Employee) => {
    return employee.name;
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = getEmployeeName(emp).toLowerCase();
    const number = emp.employeeId.toLowerCase();
    const search = employeeSearch.toLowerCase();
    return name.includes(search) || number.includes(search);
  });

  const filteredEvaluators = employees.filter((emp) => {
    const name = getEmployeeName(emp).toLowerCase();
    const number = emp.employeeId.toLowerCase();
    const search = evaluatorSearch.toLowerCase();
    return name.includes(search) || number.includes(search);
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t.loading}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.customEvaluatorsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.customEvaluatorsDescription}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addCustomEvaluator}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t.addCustomEvaluator}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t.employee}</Label>
                <Input
                  placeholder={t.selectEmployee}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredEmployees.slice(0, 50).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeId} - {getEmployeeName(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.evaluator}</Label>
                <Input
                  placeholder={t.selectEvaluator}
                  value={evaluatorSearch}
                  onChange={(e) => setEvaluatorSearch(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={formData.evaluatorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, evaluatorId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectEvaluator} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredEvaluators.slice(0, 50).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeId} - {getEmployeeName(emp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.periods}</Label>
                <Select
                  value={formData.periodId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, periodId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.allPeriods} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t.allPeriods}</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.effectiveFrom}</Label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveFrom: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.effectiveTo}</Label>
                  <Input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveTo: e.target.value })
                    }
                  />
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

      {customEvaluators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noData}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.employee}</TableHead>
              <TableHead>{t.evaluator}</TableHead>
              <TableHead>{t.periods}</TableHead>
              <TableHead>{t.effectiveFrom}</TableHead>
              <TableHead>{t.effectiveTo}</TableHead>
              <TableHead>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customEvaluators.map((ce) => (
              <TableRow key={ce.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{getEmployeeName(ce.employee)}</div>
                    <div className="text-xs text-muted-foreground">
                      {ce.employee.employeeId}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{getEmployeeName(ce.evaluator)}</div>
                    <div className="text-xs text-muted-foreground">
                      {ce.evaluator.employeeId}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {ce.period ? ce.period.name : t.allPeriods}
                </TableCell>
                <TableCell>
                  {ce.effectiveFrom
                    ? new Date(ce.effectiveFrom).toLocaleDateString(language)
                    : "-"}
                </TableCell>
                <TableCell>
                  {ce.effectiveTo
                    ? new Date(ce.effectiveTo).toLocaleDateString(language)
                    : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ce.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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
