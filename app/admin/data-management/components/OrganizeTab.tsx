"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { cn } from "@/lib/utils";
import type { DataManagementTranslation } from "../translations";
import { DeleteOrganizationData } from "@/components/DeleteOrganizationData";
import { MergeDialog } from "./MergeDialog";

// 型定義
interface Manager {
  id: string;
  name: string;
  position: string;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  manager: Manager | null;
}

interface Section {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: Course[];
  manager: Manager | null;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: Section[];
  manager: Manager | null;
}

interface Organization {
  id: string;
  name: string;
  employeeCount: number;
}

interface OrganizationData {
  organization: Organization | null;
  departments: Department[];
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  position: string;
}

interface OrganizeTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

type UnitType = "department" | "section" | "course";

interface SelectedUnit {
  type: UnitType;
  id: string;
  name: string;
  currentManager: Manager | null;
}

type OrganizationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

interface PublishSettings {
  id: string;
  name: string;
  status: OrganizationStatus;
  publishAt: string | null;
  publishedAt: string | null;
}

export function OrganizeTab({ organizationId, language, t }: OrganizeTabProps) {
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedSects, setExpandedSects] = useState<Set<string>>(new Set());

  // Manager assignment dialog
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(false);

  // Publish settings
  const [publishSettings, setPublishSettings] =
    useState<PublishSettings | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishAction, setPublishAction] = useState<"publish" | "schedule">(
    "publish",
  );
  const [updatingPublish, setUpdatingPublish] = useState(false);
  const [publishError, setPublishError] = useState<{
    message: string;
    unassigned?: string[];
  } | null>(null);

  // Cancel import
  const [cancelStatus, setCancelStatus] = useState<{
    canCancel: boolean;
    batchId?: string;
    importedAt?: string;
    changeLogCount?: number;
  } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingImport, setCancellingImport] = useState(false);

  // Merge dialog
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Auto-assign dialog
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
  const [autoAssignPreview, setAutoAssignPreview] = useState<{
    statistics: {
      departments: { total: number; withManager: number; canAssign: number };
      sections: { total: number; withManager: number; canAssign: number };
      courses: { total: number; withManager: number; canAssign: number };
    };
    preview: {
      type: string;
      name: string;
      currentManager: string | null;
      suggestedManager: { name: string; position: string } | null;
    }[];
    totalPreview: number;
  } | null>(null);
  const [loadingAutoAssign, setLoadingAutoAssign] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [executingAutoAssign, setExecutingAutoAssign] = useState(false);

  // Fetch organization data
  const fetchOrgData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/organization?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch organization data");
      const data: OrganizationData = await response.json();
      setOrgData(data);
    } catch (err) {
      setError("Failed to load organization data");
      console.error("Error fetching organization data:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Fetch publish settings
  const fetchPublishSettings = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetch(
        `/api/admin/organization/publish?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setPublishSettings(data);
      }
    } catch (err) {
      console.error("Error fetching publish settings:", err);
    }
  }, [organizationId]);

  // Fetch cancel status
  const fetchCancelStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organization/import/cancel");
      if (response.ok) {
        const data = await response.json();
        setCancelStatus(data);
      }
    } catch (err) {
      console.error("Error fetching cancel status:", err);
    }
  }, []);

  // Fetch auto-assign preview
  const fetchAutoAssignPreview = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoadingAutoAssign(true);
      const response = await fetch(
        `/api/admin/organization/auto-assign-managers?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAutoAssignPreview(data);
      }
    } catch (err) {
      console.error("Error fetching auto-assign preview:", err);
    } finally {
      setLoadingAutoAssign(false);
    }
  }, [organizationId]);

  // Execute auto-assign
  const handleAutoAssign = async () => {
    if (!organizationId) return;

    try {
      setExecutingAutoAssign(true);
      const response = await fetch(
        "/api/admin/organization/auto-assign-managers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            overwriteExisting,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to auto-assign managers");
      }

      // Refresh data
      await fetchOrgData();
      setShowAutoAssignDialog(false);
      setAutoAssignPreview(null);
    } catch (err) {
      console.error("Error auto-assigning managers:", err);
    } finally {
      setExecutingAutoAssign(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
    fetchPublishSettings();
    fetchCancelStatus();
  }, [fetchOrgData, fetchPublishSettings, fetchCancelStatus]);

  // Handle publish action
  const handlePublishAction = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      setPublishError(null);
      const body: {
        organizationId: string;
        action: string;
        publishAt?: string;
      } = {
        organizationId,
        action: publishAction,
      };

      if (publishAction === "schedule" && publishDate) {
        body.publishAt = new Date(publishDate).toISOString();
      }

      const response = await fetch("/api/admin/organization/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "MANAGERS_NOT_ASSIGNED") {
          setPublishError({
            message: t.managersNotAssigned,
            unassigned: errorData.unassigned,
          });
          return;
        }
        throw new Error(errorData.error || "Failed to update publish settings");
      }

      await fetchPublishSettings();
      setShowPublishDialog(false);
      setPublishDate("");
    } catch (err) {
      console.error("Error updating publish settings:", err);
    } finally {
      setUpdatingPublish(false);
    }
  };

  // Cancel scheduled publish
  const handleCancelSchedule = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      const response = await fetch("/api/admin/organization/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          action: "cancel",
        }),
      });

      if (!response.ok) throw new Error("Failed to cancel schedule");
      await fetchPublishSettings();
    } catch (err) {
      console.error("Error canceling schedule:", err);
    } finally {
      setUpdatingPublish(false);
    }
  };

  // Cancel import (rollback)
  const handleCancelImport = async () => {
    try {
      setCancellingImport(true);
      const response = await fetch("/api/admin/organization/import/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel import");
      }

      // Refresh all data
      await Promise.all([
        fetchOrgData(),
        fetchPublishSettings(),
        fetchCancelStatus(),
      ]);
      setShowCancelDialog(false);
    } catch (err) {
      console.error("Error cancelling import:", err);
    } finally {
      setCancellingImport(false);
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status: OrganizationStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-muted text-muted-foreground";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "PUBLISHED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get status label
  const getStatusLabel = (status: OrganizationStatus) => {
    switch (status) {
      case "DRAFT":
        return t.statusDraft;
      case "SCHEDULED":
        return t.statusScheduled;
      case "PUBLISHED":
        return t.statusPublished;
      case "ARCHIVED":
        return t.statusArchived;
      default:
        return status;
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch manager candidates for manager selection
  const fetchEmployees = useCallback(
    async (unitType: UnitType, unitId: string, showAll = false) => {
      try {
        setLoadingEmployees(true);
        const params = new URLSearchParams();
        params.set("type", unitType);
        params.set("id", unitId);
        if (showAll) {
          params.set("showAll", "true");
        }

        const response = await fetch(
          `/api/admin/organization/manager-candidates?${params}`,
        );
        if (!response.ok) throw new Error("Failed to fetch manager candidates");
        const data = await response.json();
        setEmployees(data.candidates || []);
      } catch (err) {
        console.error("Error fetching manager candidates:", err);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    },
    [],
  );

  // Handle unit click to open manager assignment dialog
  const handleUnitClick = (
    type: UnitType,
    id: string,
    name: string,
    currentManager: Manager | null,
  ) => {
    setSelectedUnit({ type, id, name, currentManager });
    setEmployeeSearch("");
    setPositionFilter("");
    setShowAllPositions(false);
    fetchEmployees(type, id, false);
  };

  // Handle showAllPositions toggle
  const handleShowAllPositionsToggle = (checked: boolean) => {
    setShowAllPositions(checked);
    if (selectedUnit) {
      fetchEmployees(selectedUnit.type, selectedUnit.id, checked);
    }
  };

  // Handle manager assignment
  const handleAssignManager = async (employeeId: string | null) => {
    if (!selectedUnit) return;

    try {
      setUpdating(true);
      const response = await fetch("/api/admin/organization/manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedUnit.type,
          id: selectedUnit.id,
          managerId: employeeId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update manager");

      // Refresh organization data
      await fetchOrgData();
      setSelectedUnit(null);
    } catch (err) {
      console.error("Error updating manager:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Toggle expand/collapse
  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const toggleSect = (sectId: string) => {
    setExpandedSects((prev) => {
      const next = new Set(prev);
      if (next.has(sectId)) {
        next.delete(sectId);
      } else {
        next.add(sectId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!orgData) return;
    setExpandedDepts(new Set(orgData.departments.map((d) => d.id)));
    const allSects = new Set<string>();
    orgData.departments.forEach((d) => {
      d.sections.forEach((s) => {
        allSects.add(s.id);
      });
    });
    setExpandedSects(allSects);
  };

  const collapseAll = () => {
    setExpandedDepts(new Set());
    setExpandedSects(new Set());
  };

  // Get unique positions for filter
  const uniquePositions = useMemo(() => {
    const positions = new Set(employees.map((emp) => emp.position).filter(Boolean));
    return Array.from(positions).sort((a, b) => a.localeCompare(b, "ja"));
  }, [employees]);

  // Filter employees by search and position
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !employeeSearch ||
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.position.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesPosition =
      !positionFilter || emp.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  // Sort departments with "役員・顧問" last
  const sortedDepartments = useMemo(() => {
    if (!orgData?.departments) return [];
    return [...orgData.departments].sort((a, b) => {
      // "役員・顧問" を最後に
      if (a.name === EXECUTIVES_DEPARTMENT_NAME) return 1;
      if (b.name === EXECUTIVES_DEPARTMENT_NAME) return -1;
      // それ以外はコード順（元の順序を維持）
      return 0;
    });
  }, [orgData?.departments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={fetchOrgData}>
          {t.refresh}
        </Button>
      </div>
    );
  }

  if (!orgData?.organization) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noOrganization}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-340px)] min-h-[400px]">
      {/* Header with Publish Settings */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t.organizeTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.organizeDescription}
          </p>
        </div>
        {publishSettings && (
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass(publishSettings.status)}>
                {getStatusLabel(publishSettings.status)}
              </Badge>
            </div>

            {/* Publish Date Info */}
            {publishSettings.status === "SCHEDULED" &&
              publishSettings.publishAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(publishSettings.publishAt)}
                </span>
              )}
            {publishSettings.status === "PUBLISHED" &&
              publishSettings.publishedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(publishSettings.publishedAt)}
                </span>
              )}

            {/* Action Buttons */}
            {publishSettings.status === "DRAFT" && (
              <>
                {cancelStatus?.canCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    {t.cancelImport}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMergeDialog(true)}
                >
                  {t.merge}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAutoAssignDialog(true);
                    fetchAutoAssignPreview();
                  }}
                >
                  {t.autoAssign}
                </Button>
                <Button size="sm" onClick={() => setShowPublishDialog(true)}>
                  {t.setPublishDate}
                </Button>
                <DeleteOrganizationData
                  organizationId={organizationId}
                  language={language}
                  stats={{
                    totalEmployees:
                      orgData?.organization?.employeeCount ?? 0,
                    departments: orgData?.departments?.length ?? 0,
                    sections:
                      orgData?.departments?.reduce(
                        (sum, d) => sum + d.sections.length,
                        0,
                      ) ?? 0,
                    courses:
                      orgData?.departments?.reduce(
                        (sum, d) =>
                          sum +
                          d.sections.reduce(
                            (s, sec) => s + sec.courses.length,
                            0,
                          ),
                        0,
                      ) ?? 0,
                  }}
                />
              </>
            )}
            {publishSettings.status === "SCHEDULED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSchedule}
                disabled={updatingPublish}
              >
                {t.cancelSchedule}
              </Button>
            )}
            {publishSettings.status === "ARCHIVED" && (
              <DeleteOrganizationData
                organizationId={organizationId}
                language={language}
                stats={{
                  totalEmployees:
                    orgData?.organization?.employeeCount ?? 0,
                  departments: orgData?.departments?.length ?? 0,
                  sections:
                    orgData?.departments?.reduce(
                      (sum, d) => sum + d.sections.length,
                      0,
                    ) ?? 0,
                  courses:
                    orgData?.departments?.reduce(
                      (sum, d) =>
                        sum +
                        d.sections.reduce(
                          (s, sec) => s + sec.courses.length,
                          0,
                        ),
                      0,
                    ) ?? 0,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={expandAll}
          className="text-xs"
        >
          {t.expandAll}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={collapseAll}
          className="text-xs"
        >
          {t.collapseAll}
        </Button>
      </div>

      {/* Organization Tree */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-4">
          {/* Departments */}
          {sortedDepartments.map((dept) => {
            const isDeptExpanded = expandedDepts.has(dept.id);

            return (
              <Collapsible
                key={dept.id}
                open={isDeptExpanded}
                onOpenChange={() => toggleDept(dept.id)}
              >
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isDeptExpanded && "rotate-90",
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </CollapsibleTrigger>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{dept.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {dept.employeeCount}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUnitClick(
                          "department",
                          dept.id,
                          dept.name,
                          dept.manager,
                        )
                      }
                      className="text-xs mt-1 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
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
                      {dept.manager ? (
                        <span>
                          {dept.manager.name} ({dept.manager.position})
                        </span>
                      ) : (
                        <span className="text-orange-500">{t.noManager}</span>
                      )}
                      <svg
                        className="w-3 h-3 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <CollapsibleContent className="ml-6 mt-1 space-y-1">
                  {dept.sections.map((sect) => {
                    const isSectExpanded = expandedSects.has(sect.id);

                    return (
                      <Collapsible
                        key={sect.id}
                        open={isSectExpanded}
                        onOpenChange={() => toggleSect(sect.id)}
                      >
                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                          {sect.courses.length > 0 ? (
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="p-1 hover:bg-muted rounded"
                              >
                                <svg
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    isSectExpanded && "rotate-90",
                                  )}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </CollapsibleTrigger>
                          ) : (
                            <div className="w-5" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{sect.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {sect.employeeCount}
                              </Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleUnitClick(
                                  "section",
                                  sect.id,
                                  sect.name,
                                  sect.manager,
                                )
                              }
                              className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <svg
                                className="w-2.5 h-2.5"
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
                              {sect.manager ? (
                                <span>{sect.manager.name}</span>
                              ) : (
                                <span className="text-orange-500">
                                  {t.noManager}
                                </span>
                              )}
                              <svg
                                className="w-2.5 h-2.5 ml-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <CollapsibleContent className="ml-6 mt-1 space-y-1 border-l border-muted pl-2">
                          {sect.courses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted"
                            >
                              <div className="w-5" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">{course.name}</span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {course.employeeCount}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUnitClick(
                                      "course",
                                      course.id,
                                      course.name,
                                      course.manager,
                                    )
                                  }
                                  className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <svg
                                    className="w-2.5 h-2.5"
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
                                  {course.manager ? (
                                    <span>{course.manager.name}</span>
                                  ) : (
                                    <span className="text-orange-500">
                                      {t.noManager}
                                    </span>
                                  )}
                                  <svg
                                    className="w-2.5 h-2.5 ml-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Manager Assignment Dialog */}
      <Dialog open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit?.currentManager ? t.changeManager : t.assignManager}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Unit Info */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">{selectedUnit?.name}</p>
              {selectedUnit?.currentManager && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.manager}: {selectedUnit.currentManager.name} (
                  {selectedUnit.currentManager.position})
                </p>
              )}
            </div>

            {/* Search, Position Filter, and Toggle */}
            <div className="space-y-2">
              <Input
                placeholder={t.searchPlaceholder}
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
              <div className="flex items-center gap-3">
                {uniquePositions.length > 1 && (
                  <Select
                    value={positionFilter}
                    onValueChange={(v) =>
                      setPositionFilter(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue
                        placeholder={`${t.position}: ${t.all}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t.position}: {t.all}
                      </SelectItem>
                      {uniquePositions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showAllPositions}
                    onClick={() =>
                      handleShowAllPositionsToggle(!showAllPositions)
                    }
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                      showAllPositions
                        ? "bg-primary"
                        : "bg-gray-200 dark:bg-gray-700",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        showAllPositions ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                  <span className="text-muted-foreground">
                    {t.showAllPositions}
                  </span>
                </label>
              </div>
            </div>

            {/* Employee List */}
            <ScrollArea className="h-[300px] border rounded-md">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t.noEmployees}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleAssignManager(emp.id)}
                      disabled={updating}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-muted transition-colors",
                        selectedUnit?.currentManager?.id === emp.id &&
                          "bg-primary/10",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.employeeId} / {emp.position}
                        </p>
                      </div>
                      {selectedUnit?.currentManager?.id === emp.id && (
                        <Badge variant="secondary" className="text-xs">
                          {t.manager}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between">
              {selectedUnit?.currentManager && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAssignManager(null)}
                  disabled={updating}
                >
                  {t.removeManager}
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setSelectedUnit(null)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Settings Dialog */}
      <Dialog
        open={showPublishDialog}
        onOpenChange={(open) => {
          setShowPublishDialog(open);
          if (!open) setPublishError(null);
        }}
      >
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.setPublishDate}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Selection */}
            <div className="flex gap-2">
              <Button
                variant={publishAction === "publish" ? "default" : "outline"}
                size="sm"
                onClick={() => setPublishAction("publish")}
                className="flex-1"
              >
                {t.publishNow}
              </Button>
              <Button
                variant={publishAction === "schedule" ? "default" : "outline"}
                size="sm"
                onClick={() => setPublishAction("schedule")}
                className="flex-1"
              >
                {t.schedulePublish}
              </Button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {publishAction === "publish"
                ? t.confirmPublishNow
                : t.confirmSchedule}
            </p>

            {/* Error: managers not assigned */}
            {publishError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">
                  {publishError.message}
                </p>
                {publishError.unassigned && (
                  <ul className="list-disc list-inside text-xs text-destructive/80 space-y-0.5 mt-2 max-h-[150px] overflow-y-auto">
                    {publishError.unassigned.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-destructive/60 mt-2">
                  {publishError.unassigned?.length}
                  {t.managersNotAssignedCount}
                </p>
              </div>
            )}

            {/* Date Picker for Schedule */}
            {publishAction === "schedule" && (
              <div className="space-y-2">
                <label htmlFor="publishDate" className="text-sm font-medium">
                  {t.publishAt}
                </label>
                <Input
                  id="publishDate"
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPublishDialog(false);
                  setPublishDate("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handlePublishAction}
                disabled={
                  updatingPublish ||
                  (publishAction === "schedule" && !publishDate)
                }
              >
                {updatingPublish
                  ? t.loading
                  : publishAction === "publish"
                    ? t.publishNow
                    : t.schedulePublish}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Import Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.cancelImportTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {t.cancelImportDescription}
            </p>

            {/* Import Info */}
            {cancelStatus?.canCancel && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.importedAt}:</span>
                  <span>{formatDate(cancelStatus.importedAt || null)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.affectedRecords}:
                  </span>
                  <span>{cancelStatus.changeLogCount}</span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {t.cancelImportConfirm}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancellingImport}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelImport}
                disabled={cancellingImport}
              >
                {cancellingImport ? t.cancellingImport : t.cancelImport}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-assign Dialog */}
      <Dialog
        open={showAutoAssignDialog}
        onOpenChange={setShowAutoAssignDialog}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>{t.autoAssignTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {t.autoAssignDescription}
            </p>

            {/* Statistics */}
            {loadingAutoAssign ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : autoAssignPreview ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {/* Departments */}
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t.department}
                    </p>
                    <p className="text-lg font-semibold">
                      {autoAssignPreview.statistics.departments.canAssign}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {autoAssignPreview.statistics.departments.total}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.currentlyAssigned}:{" "}
                      {autoAssignPreview.statistics.departments.withManager}
                    </p>
                  </div>

                  {/* Sections */}
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t.section}
                    </p>
                    <p className="text-lg font-semibold">
                      {autoAssignPreview.statistics.sections.canAssign}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {autoAssignPreview.statistics.sections.total}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.currentlyAssigned}:{" "}
                      {autoAssignPreview.statistics.sections.withManager}
                    </p>
                  </div>

                  {/* Courses */}
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t.course}
                    </p>
                    <p className="text-lg font-semibold">
                      {autoAssignPreview.statistics.courses.canAssign}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {autoAssignPreview.statistics.courses.total}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.currentlyAssigned}:{" "}
                      {autoAssignPreview.statistics.courses.withManager}
                    </p>
                  </div>
                </div>

                {/* Preview list */}
                {autoAssignPreview.preview.length > 0 && (
                  <div className="border rounded-md">
                    <div className="p-2 bg-muted text-sm font-medium">
                      {t.autoAssignPreview} ({autoAssignPreview.totalPreview})
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-2 space-y-2">
                        {autoAssignPreview.preview.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">
                                {item.name}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.type === "department"
                                  ? t.department
                                  : item.type === "section"
                                    ? t.section
                                    : t.course}
                              </Badge>
                            </div>
                            <div className="text-right ml-2">
                              {item.suggestedManager && (
                                <>
                                  <p className="font-medium text-green-600 dark:text-green-400">
                                    {item.suggestedManager.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.suggestedManager.position}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* No candidates message */}
                {autoAssignPreview.statistics.departments.canAssign === 0 &&
                  autoAssignPreview.statistics.sections.canAssign === 0 &&
                  autoAssignPreview.statistics.courses.canAssign === 0 && (
                    <div className="p-4 bg-muted rounded-md text-center text-sm text-muted-foreground">
                      {language === "ja"
                        ? "自動割当できる部署がありません。すでに全ての責任者が設定されているか、役職から責任者を特定できません。"
                        : "No departments can be auto-assigned. Either all managers are already set, or no suitable candidates were found."}
                    </div>
                  )}

                {/* Overwrite option */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span>{t.overwriteExisting}</span>
                </label>
              </>
            ) : null}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAutoAssignDialog(false);
                  setAutoAssignPreview(null);
                  setOverwriteExisting(false);
                }}
                disabled={executingAutoAssign}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleAutoAssign}
                disabled={
                  executingAutoAssign ||
                  loadingAutoAssign ||
                  !autoAssignPreview ||
                  (autoAssignPreview.statistics.departments.canAssign === 0 &&
                    autoAssignPreview.statistics.sections.canAssign === 0 &&
                    autoAssignPreview.statistics.courses.canAssign === 0 &&
                    !overwriteExisting)
                }
              >
                {executingAutoAssign ? t.autoAssigning : t.autoAssignExecute}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {orgData?.organization && (
        <MergeDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          targetOrgId={organizationId}
          targetOrgName={orgData.organization.name}
          language={language}
          t={t}
          onMergeComplete={() => {
            fetchOrgData();
            fetchPublishSettings();
          }}
        />
      )}
    </div>
  );
}
