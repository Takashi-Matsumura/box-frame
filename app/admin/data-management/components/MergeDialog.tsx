"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DataManagementTranslation } from "../translations";

// Types
interface MergeCandidate {
  id: string;
  name: string;
  employeeCount: number;
  departmentCount: number;
  status: string;
}

interface DepartmentInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: SectionInfo[];
}

interface SectionInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: CourseInfo[];
}

interface CourseInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
}

interface SuggestedMapping {
  sourceDeptId: string;
  targetDeptId: string | null;
  matchType: "exact" | "partial" | "none";
}

interface DepartmentMapping {
  sourceDeptId: string;
  targetDeptId: string | null;
  sourceDeptName: string;
  targetDeptName?: string;
}

interface MergePreview {
  employeesToTransfer: number;
  departmentsToMerge: number;
  departmentsToCreate: number;
  sectionsToCreate: number;
  coursesToCreate: number;
  employees: {
    employeeId: string;
    name: string;
    sourceDept: string;
    sourceSection?: string;
    sourceCourse?: string;
    targetDept: string;
    targetSection?: string;
    targetCourse?: string;
  }[];
  warnings: string[];
}

interface DuplicateEmployee {
  sourceEmployee: {
    id: string;
    employeeId: string;
    name: string;
    position: string | null;
    department: string;
    section: string | null;
    email: string | null;
  };
  targetEmployee: {
    id: string;
    employeeId: string;
    name: string;
    position: string | null;
    department: string;
    section: string | null;
    email: string | null;
  };
}

type DuplicateResolution = "keepTarget" | "keepSource" | "skipSource";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOrgId: string;
  targetOrgName: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
  onMergeComplete: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export function MergeDialog({
  open,
  onOpenChange,
  targetOrgId,
  targetOrgName,
  language,
  t,
  onMergeComplete,
}: MergeDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Source organization selection
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  // Step 2: Department mapping
  const [sourceDepartments, setSourceDepartments] = useState<DepartmentInfo[]>(
    [],
  );
  const [targetDepartments, setTargetDepartments] = useState<DepartmentInfo[]>(
    [],
  );
  const [departmentMappings, setDepartmentMappings] = useState<
    DepartmentMapping[]
  >([]);

  // Step 3: Duplicate employees
  const [duplicateEmployees, setDuplicateEmployees] = useState<
    DuplicateEmployee[]
  >([]);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<string, DuplicateResolution>
  >({});

  // Step 4: Preview
  const [preview, setPreview] = useState<MergePreview | null>(null);

  // Step 5: Confirmation
  const [confirmationText, setConfirmationText] = useState("");
  const [executing, setExecuting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedSourceId("");
      setSourceDepartments([]);
      setTargetDepartments([]);
      setDepartmentMappings([]);
      setDuplicateEmployees([]);
      setDuplicateResolutions({});
      setPreview(null);
      setConfirmationText("");
      setError(null);
    }
  }, [open]);

  // Fetch merge candidates
  useEffect(() => {
    if (open && targetOrgId) {
      fetchCandidates();
    }
  }, [open, targetOrgId]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/organization/merge/candidates?targetOrgId=${targetOrgId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch candidates");
      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setError(t.mergeError);
    } finally {
      setLoading(false);
    }
  };

  // Fetch department mapping when source is selected
  const fetchDepartmentMapping = useCallback(async () => {
    if (!selectedSourceId || !targetOrgId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/organization/merge/department-mapping?sourceOrgId=${selectedSourceId}&targetOrgId=${targetOrgId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch department mapping");
      const data = await response.json();

      setSourceDepartments(data.sourceDepartments || []);
      setTargetDepartments(data.targetDepartments || []);

      // Initialize mappings from suggestions
      const initialMappings: DepartmentMapping[] = (
        data.suggestedMappings || []
      ).map((suggestion: SuggestedMapping) => {
        const sourceDept = data.sourceDepartments.find(
          (d: DepartmentInfo) => d.id === suggestion.sourceDeptId,
        );
        const targetDept = suggestion.targetDeptId
          ? data.targetDepartments.find(
              (d: DepartmentInfo) => d.id === suggestion.targetDeptId,
            )
          : null;

        return {
          sourceDeptId: suggestion.sourceDeptId,
          targetDeptId: suggestion.targetDeptId,
          sourceDeptName: sourceDept?.name || "",
          targetDeptName: targetDept?.name,
        };
      });

      setDepartmentMappings(initialMappings);
    } catch (err) {
      console.error("Error fetching department mapping:", err);
      setError(t.mergeError);
    } finally {
      setLoading(false);
    }
  }, [selectedSourceId, targetOrgId, t.mergeError]);

  // Fetch duplicate employees
  const fetchDuplicateEmployees = useCallback(async () => {
    if (!selectedSourceId || !targetOrgId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/organization/merge/duplicate-employees?sourceOrgId=${selectedSourceId}&targetOrgId=${targetOrgId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch duplicate employees");
      const data = await response.json();
      const duplicates: DuplicateEmployee[] = data.duplicates || [];
      setDuplicateEmployees(duplicates);

      // Initialize resolutions - default to keepTarget
      const initialResolutions: Record<string, DuplicateResolution> = {};
      for (const dup of duplicates) {
        initialResolutions[dup.sourceEmployee.id] = "keepTarget";
      }
      setDuplicateResolutions(initialResolutions);
    } catch (err) {
      console.error("Error fetching duplicate employees:", err);
      setError(t.mergeError);
    } finally {
      setLoading(false);
    }
  }, [selectedSourceId, targetOrgId, t.mergeError]);

  // Fetch preview
  const fetchPreview = useCallback(async () => {
    if (!selectedSourceId || !targetOrgId || departmentMappings.length === 0)
      return;

    try {
      setLoading(true);
      const response = await fetch("/api/admin/organization/merge/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceOrgId: selectedSourceId,
          targetOrgId,
          departmentMappings,
          duplicateResolutions,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate preview");
      const data = await response.json();
      setPreview(data.preview);
    } catch (err) {
      console.error("Error generating preview:", err);
      setError(t.mergeError);
    } finally {
      setLoading(false);
    }
  }, [
    selectedSourceId,
    targetOrgId,
    departmentMappings,
    duplicateResolutions,
    t.mergeError,
  ]);

  // Execute merge
  const executeMerge = async () => {
    const expectedText = language === "ja" ? "マージ実行" : "Merge";
    if (confirmationText !== expectedText) return;

    try {
      setExecuting(true);
      const response = await fetch("/api/admin/organization/merge/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceOrgId: selectedSourceId,
          targetOrgId,
          departmentMappings,
          duplicateResolutions,
          confirmationText,
        }),
      });

      if (!response.ok) throw new Error("Failed to execute merge");

      onMergeComplete();
      onOpenChange(false);
    } catch (err) {
      console.error("Error executing merge:", err);
      setError(t.mergeError);
    } finally {
      setExecuting(false);
    }
  };

  // Handle step navigation
  const handleNext = async () => {
    if (step === 1) {
      await fetchDepartmentMapping();
      setStep(2);
    } else if (step === 2) {
      await fetchDuplicateEmployees();
      setStep(3);
    } else if (step === 3) {
      await fetchPreview();
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  // Update department mapping
  const updateMapping = (sourceDeptId: string, targetDeptId: string | null) => {
    setDepartmentMappings((prev) =>
      prev.map((m) => {
        if (m.sourceDeptId === sourceDeptId) {
          const targetDept = targetDepartments.find(
            (d) => d.id === targetDeptId,
          );
          return {
            ...m,
            targetDeptId,
            targetDeptName: targetDept?.name,
          };
        }
        return m;
      }),
    );
  };

  // Update duplicate resolution
  const updateResolution = (
    sourceEmployeeId: string,
    resolution: DuplicateResolution,
  ) => {
    setDuplicateResolutions((prev) => ({
      ...prev,
      [sourceEmployeeId]: resolution,
    }));
  };

  const selectedSource = candidates.find((c) => c.id === selectedSourceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t.mergeTitle}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step > s ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 5 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    step > s ? "bg-green-500" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step content */}
        <ScrollArea className="max-h-[50vh]">
          {/* Step 1: Source selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.mergeDescription}
              </p>

              <div className="p-4 bg-muted rounded-md">
                <label className="text-sm font-medium">
                  {t.targetOrganization}
                </label>
                <p className="text-lg font-semibold mt-1">{targetOrgName}</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  {t.sourceOrganization}
                </label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t.noMergeCandidates}
                  </p>
                ) : (
                  <Select
                    value={selectedSourceId}
                    onValueChange={setSelectedSourceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectSourceOrganization} />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          <div className="flex items-center gap-2">
                            <span>{candidate.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {candidate.employeeCount}{" "}
                              {language === "ja" ? "名" : "employees"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedSource && (
                <div className="p-4 border rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.employeesToTransfer}:
                    </span>
                    <span className="font-medium">
                      {selectedSource.employeeCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.department}:
                    </span>
                    <span className="font-medium">
                      {selectedSource.departmentCount}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  {t.sourceArchived}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Department mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.departmentMappingDescription}
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {departmentMappings.map((mapping) => {
                    const sourceDept = sourceDepartments.find(
                      (d) => d.id === mapping.sourceDeptId,
                    );

                    return (
                      <div
                        key={mapping.sourceDeptId}
                        className="flex items-center gap-3 p-3 border rounded-md"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {mapping.sourceDeptName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {sourceDept?.employeeCount || 0}
                            </Badge>
                          </div>
                        </div>

                        <svg
                          className="w-5 h-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>

                        <div className="flex-1">
                          <Select
                            value={mapping.targetDeptId || "new"}
                            onValueChange={(value) =>
                              updateMapping(
                                mapping.sourceDeptId,
                                value === "new" ? null : value,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">
                                <span className="text-green-600 dark:text-green-400">
                                  + {t.createNewDepartment}
                                </span>
                              </SelectItem>
                              {targetDepartments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                  {dept.name.toLowerCase() ===
                                    mapping.sourceDeptName.toLowerCase() && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({t.autoMapped})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Duplicate employees */}
          {step === 3 && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : duplicateEmployees.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t.noDuplicateEmployees}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                    <p className="font-medium text-orange-800 dark:text-orange-200">
                      {duplicateEmployees.length}
                      {t.duplicateEmployeesFound}
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      {t.duplicateEmployeesDescription}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {duplicateEmployees.map((dup) => (
                      <div
                        key={dup.sourceEmployee.id}
                        className="border rounded-md overflow-hidden"
                      >
                        <div className="px-4 py-2 bg-muted font-medium">
                          {dup.sourceEmployee.name}
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            {/* Target record */}
                            <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/10">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                                {t.targetRecord} ({targetOrgName})
                              </p>
                              <div className="space-y-1 text-xs">
                                <p>
                                  ID: {dup.targetEmployee.employeeId}
                                </p>
                                <p>
                                  {t.position}:{" "}
                                  {dup.targetEmployee.position || "-"}
                                </p>
                                <p>
                                  {t.department}:{" "}
                                  {dup.targetEmployee.department}
                                  {dup.targetEmployee.section &&
                                    ` / ${dup.targetEmployee.section}`}
                                </p>
                                <p>
                                  {t.email}:{" "}
                                  {dup.targetEmployee.email || "-"}
                                </p>
                              </div>
                            </div>

                            {/* Source record */}
                            <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/10">
                              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                                {t.sourceRecord} ({selectedSource?.name})
                              </p>
                              <div className="space-y-1 text-xs">
                                <p>
                                  ID: {dup.sourceEmployee.employeeId}
                                </p>
                                <p>
                                  {t.position}:{" "}
                                  {dup.sourceEmployee.position || "-"}
                                </p>
                                <p>
                                  {t.department}:{" "}
                                  {dup.sourceEmployee.department}
                                  {dup.sourceEmployee.section &&
                                    ` / ${dup.sourceEmployee.section}`}
                                </p>
                                <p>
                                  {t.email}:{" "}
                                  {dup.sourceEmployee.email || "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Resolution options */}
                          <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`resolution-${dup.sourceEmployee.id}`}
                                checked={
                                  duplicateResolutions[
                                    dup.sourceEmployee.id
                                  ] === "keepTarget"
                                }
                                onChange={() =>
                                  updateResolution(
                                    dup.sourceEmployee.id,
                                    "keepTarget",
                                  )
                                }
                                className="accent-primary"
                              />
                              <span className="text-sm">
                                {t.keepTarget}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({t.recommended})
                                </span>
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`resolution-${dup.sourceEmployee.id}`}
                                checked={
                                  duplicateResolutions[
                                    dup.sourceEmployee.id
                                  ] === "keepSource"
                                }
                                onChange={() =>
                                  updateResolution(
                                    dup.sourceEmployee.id,
                                    "keepSource",
                                  )
                                }
                                className="accent-primary"
                              />
                              <span className="text-sm">{t.keepSource}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`resolution-${dup.sourceEmployee.id}`}
                                checked={
                                  duplicateResolutions[
                                    dup.sourceEmployee.id
                                  ] === "skipSource"
                                }
                                onChange={() =>
                                  updateResolution(
                                    dup.sourceEmployee.id,
                                    "skipSource",
                                  )
                                }
                                className="accent-primary"
                              />
                              <span className="text-sm">{t.skipSource}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : preview ? (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md text-center">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {preview.employeesToTransfer}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {t.employeesToTransfer}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-md text-center">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {preview.departmentsToMerge}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {t.departmentsToMerge}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-md text-center">
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {preview.departmentsToCreate}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {t.departmentsToCreate}
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {preview.warnings.length > 0 && (
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                        {t.mergeWarnings}
                      </p>
                      <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300">
                        {preview.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Employee list */}
                  <div>
                    <p className="font-medium mb-2">{t.employeeList}</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left">
                              {t.employeeId}
                            </th>
                            <th className="px-3 py-2 text-left">{t.name}</th>
                            <th className="px-3 py-2 text-left">{t.from}</th>
                            <th className="px-3 py-2 text-left">{t.to}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.employees.slice(0, 10).map((emp, idx) => (
                            <tr
                              key={emp.employeeId}
                              className={
                                idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                              }
                            >
                              <td className="px-3 py-2">{emp.employeeId}</td>
                              <td className="px-3 py-2">{emp.name}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {emp.sourceDept}
                                {emp.sourceSection && ` / ${emp.sourceSection}`}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {emp.targetDept}
                                {emp.targetSection && ` / ${emp.targetSection}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {preview.employees.length > 10 && (
                        <div className="px-3 py-2 bg-muted text-center text-sm text-muted-foreground">
                          ... {t.all} {preview.employees.length}{" "}
                          {language === "ja" ? "名" : "employees"}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">
                  {t.confirmMerge}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "ja" ? t.typeToConfirmJa : t.typeToConfirm}
                </p>
              </div>

              <div>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={language === "ja" ? "マージ実行" : "Merge"}
                  className="text-center"
                />
              </div>

              {preview && (
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p>
                    {t.sourceOrganization}: {selectedSource?.name}
                  </p>
                  <p>
                    {t.targetOrganization}: {targetOrgName}
                  </p>
                  <p>
                    {t.employeesToTransfer}: {preview.employeesToTransfer}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={loading || executing}
              >
                {t.previous}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={executing}
            >
              {t.cancel}
            </Button>
            {step < 5 ? (
              <Button
                onClick={handleNext}
                disabled={
                  loading ||
                  (step === 1 && !selectedSourceId) ||
                  (step === 2 && departmentMappings.length === 0)
                }
              >
                {loading ? t.loading : t.next}
              </Button>
            ) : (
              <Button
                onClick={executeMerge}
                disabled={
                  executing ||
                  confirmationText !==
                    (language === "ja" ? "マージ実行" : "Merge")
                }
                className="bg-destructive hover:bg-destructive/90"
              >
                {executing ? t.merging : t.executeMerge}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
