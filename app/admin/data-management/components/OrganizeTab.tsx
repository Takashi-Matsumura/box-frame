"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DataManagementTranslation } from "../translations";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";

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
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Publish settings
  const [publishSettings, setPublishSettings] = useState<PublishSettings | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishAction, setPublishAction] = useState<"publish" | "schedule">("publish");
  const [updatingPublish, setUpdatingPublish] = useState(false);

  // Fetch organization data
  const fetchOrgData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/organization");
      if (!response.ok) throw new Error("Failed to fetch organization data");
      const data: OrganizationData = await response.json();
      setOrgData(data);
    } catch (err) {
      setError("Failed to load organization data");
      console.error("Error fetching organization data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch publish settings
  const fetchPublishSettings = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetch(`/api/admin/organization/publish?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setPublishSettings(data);
      }
    } catch (err) {
      console.error("Error fetching publish settings:", err);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOrgData();
    fetchPublishSettings();
  }, [fetchOrgData, fetchPublishSettings]);

  // Handle publish action
  const handlePublishAction = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      const body: { organizationId: string; action: string; publishAt?: string } = {
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
        const error = await response.json();
        throw new Error(error.error || "Failed to update publish settings");
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
  const fetchEmployees = useCallback(async (unitType: UnitType, unitId: string) => {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams();
      params.set("type", unitType);
      params.set("id", unitId);

      const response = await fetch(`/api/admin/organization/manager-candidates?${params}`);
      if (!response.ok) throw new Error("Failed to fetch manager candidates");
      const data = await response.json();
      setEmployees(data.candidates || []);
    } catch (err) {
      console.error("Error fetching manager candidates:", err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Handle unit click to open manager assignment dialog
  const handleUnitClick = (type: UnitType, id: string, name: string, currentManager: Manager | null) => {
    setSelectedUnit({ type, id, name, currentManager });
    setEmployeeSearch("");
    fetchEmployees(type, id);
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

  // Filter employees by search
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.position.toLowerCase().includes(employeeSearch.toLowerCase())
  );

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
    <div>
      {/* Header with Publish Settings */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t.organizeTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.organizeDescription}</p>
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
            {publishSettings.status === "SCHEDULED" && publishSettings.publishAt && (
              <span className="text-xs text-muted-foreground">
                {formatDate(publishSettings.publishAt)}
              </span>
            )}
            {publishSettings.status === "PUBLISHED" && publishSettings.publishedAt && (
              <span className="text-xs text-muted-foreground">
                {formatDate(publishSettings.publishedAt)}
              </span>
            )}

            {/* Action Buttons */}
            {publishSettings.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
              >
                {t.setPublishDate}
              </Button>
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
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
          {t.expandAll}
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
          {t.collapseAll}
        </Button>
      </div>

      {/* Organization Tree */}
      <ScrollArea className="h-[calc(100vh-340px)]">
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
                    <button type="button" className="p-1 hover:bg-muted rounded">
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isDeptExpanded && "rotate-90"
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
                      onClick={() => handleUnitClick("department", dept.id, dept.name, dept.manager)}
                      className="text-xs mt-1 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {dept.manager ? (
                        <span>{dept.manager.name} ({dept.manager.position})</span>
                      ) : (
                        <span className="text-orange-500">{t.noManager}</span>
                      )}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                              <button type="button" className="p-1 hover:bg-muted rounded">
                                <svg
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    isSectExpanded && "rotate-90"
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
                              onClick={() => handleUnitClick("section", sect.id, sect.name, sect.manager)}
                              className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {sect.manager ? (
                                <span>{sect.manager.name}</span>
                              ) : (
                                <span className="text-orange-500">{t.noManager}</span>
                              )}
                              <svg className="w-2.5 h-2.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <CollapsibleContent className="ml-6 mt-1 space-y-1 border-l border-muted pl-2">
                          {sect.courses.map((course) => (
                            <div key={course.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted">
                              <div className="w-5" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">{course.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {course.employeeCount}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnitClick("course", course.id, course.name, course.manager)}
                                  className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {course.manager ? (
                                    <span>{course.manager.name}</span>
                                  ) : (
                                    <span className="text-orange-500">{t.noManager}</span>
                                  )}
                                  <svg className="w-2.5 h-2.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                  {t.manager}: {selectedUnit.currentManager.name} ({selectedUnit.currentManager.position})
                </p>
              )}
            </div>

            {/* Search */}
            <Input
              placeholder={t.searchPlaceholder}
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />

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
                        selectedUnit?.currentManager?.id === emp.id && "bg-primary/10"
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
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-[450px]">
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
              {publishAction === "publish" ? t.confirmPublishNow : t.confirmSchedule}
            </p>

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
                disabled={updatingPublish || (publishAction === "schedule" && !publishDate)}
              >
                {updatingPublish ? t.loading : publishAction === "publish" ? t.publishNow : t.schedulePublish}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
