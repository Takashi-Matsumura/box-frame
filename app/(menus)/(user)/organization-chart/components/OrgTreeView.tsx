"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Language, Translations } from "../translations";

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

interface Selection {
  departmentId: string | null;
  departmentName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  courseId: string | null;
  courseName: string | null;
}

interface OrgTreeViewProps {
  organization: Organization | null;
  departments: Department[];
  selection: Selection;
  onSelectNode: (
    type: "organization" | "department" | "section" | "course",
    id: string | null,
    name: string | null,
  ) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  t: Translations;
  language: Language;
}

export function OrgTreeView({
  organization,
  departments,
  selection,
  onSelectNode,
  loading,
  error,
  onRetry,
  t,
  language,
}: OrgTreeViewProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedSects, setExpandedSects] = useState<Set<string>>(new Set());

  // 展開状態の切り替え
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

  // 全て展開/折りたたみ
  const expandAll = () => {
    setExpandedDepts(new Set(departments.map((d) => d.id)));
    const allSects = new Set<string>();
    departments.forEach((d) => {
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

  // ローディング中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          {t.retry}
        </Button>
      </div>
    );
  }

  // データなし
  if (!organization) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.noEmployees}
      </div>
    );
  }

  const isOrgSelected =
    !selection.departmentId && !selection.sectionId && !selection.courseId;

  return (
    <div className="space-y-2 pr-3">
      {/* 展開/折りたたみボタン */}
      <div className="flex gap-2 mb-4">
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

      {/* 組織ルート */}
      <button
        type="button"
        onClick={() => onSelectNode("organization", null, null)}
        className={cn(
          "w-full flex items-center justify-between p-2 rounded-md text-left transition-colors",
          isOrgSelected
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted",
        )}
      >
        <span className="font-semibold">{organization.name}</span>
        <Badge
          variant="secondary"
          className={cn(
            isOrgSelected && "bg-primary-foreground/20 text-primary-foreground",
          )}
        >
          {organization.employeeCount}
          {language === "ja" ? t.employees : ""}
        </Badge>
      </button>

      {/* 本部リスト */}
      {departments.map((dept) => {
        const isDeptSelected =
          selection.departmentId === dept.id &&
          !selection.sectionId &&
          !selection.courseId;
        const isDeptExpanded = expandedDepts.has(dept.id);

        return (
          <Collapsible
            key={dept.id}
            open={isDeptExpanded}
            onOpenChange={() => toggleDept(dept.id)}
          >
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button type="button" className="p-1 hover:bg-muted rounded">
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
              <button
                type="button"
                onClick={() => onSelectNode("department", dept.id, dept.name)}
                className={cn(
                  "flex-1 flex flex-col p-2 rounded-md text-left transition-colors",
                  isDeptSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{dept.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      isDeptSelected &&
                        "bg-primary-foreground/20 text-primary-foreground",
                    )}
                  >
                    {dept.employeeCount}
                  </Badge>
                </div>
                {dept.manager && (
                  <div
                    className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      isDeptSelected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
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
                    <span>{dept.manager.name}</span>
                    <span className="opacity-70">
                      ({dept.manager.position})
                    </span>
                  </div>
                )}
              </button>
            </div>

            <CollapsibleContent className="ml-4 mt-1 space-y-1">
              {dept.sections.map((sect) => {
                const isSectSelected =
                  selection.sectionId === sect.id && !selection.courseId;
                const isSectExpanded = expandedSects.has(sect.id);

                return (
                  <Collapsible
                    key={sect.id}
                    open={isSectExpanded}
                    onOpenChange={() => toggleSect(sect.id)}
                  >
                    <div className="flex items-center">
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
                      <button
                        type="button"
                        onClick={() => {
                          // 親の本部を選択状態に保持
                          if (selection.departmentId !== dept.id) {
                            onSelectNode("department", dept.id, dept.name);
                          }
                          setTimeout(() => {
                            onSelectNode("section", sect.id, sect.name);
                          }, 0);
                        }}
                        className={cn(
                          "flex-1 flex flex-col p-1.5 rounded-md text-left text-sm transition-colors",
                          isSectSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{sect.name}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              isSectSelected &&
                                "bg-primary-foreground/20 text-primary-foreground",
                            )}
                          >
                            {sect.employeeCount}
                          </Badge>
                        </div>
                        {sect.manager && (
                          <div
                            className={cn(
                              "text-xs mt-0.5 flex items-center gap-1",
                              isSectSelected
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground",
                            )}
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
                            <span>{sect.manager.name}</span>
                          </div>
                        )}
                      </button>
                    </div>

                    <CollapsibleContent className="ml-6 mt-1 space-y-1 border-l border-muted pl-2">
                      {sect.courses.map((course) => {
                        const isCourseSelected =
                          selection.courseId === course.id;

                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => {
                              // 親の本部と部を選択状態に保持
                              if (selection.departmentId !== dept.id) {
                                onSelectNode("department", dept.id, dept.name);
                              }
                              if (selection.sectionId !== sect.id) {
                                setTimeout(() => {
                                  onSelectNode("section", sect.id, sect.name);
                                }, 0);
                              }
                              setTimeout(() => {
                                onSelectNode("course", course.id, course.name);
                              }, 0);
                            }}
                            className={cn(
                              "w-full flex flex-col p-1.5 rounded-md text-left text-sm transition-colors",
                              isCourseSelected
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted",
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{course.name}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  isCourseSelected &&
                                    "bg-primary-foreground/20 text-primary-foreground",
                                )}
                              >
                                {course.employeeCount}
                              </Badge>
                            </div>
                            {course.manager && (
                              <div
                                className={cn(
                                  "text-xs mt-0.5 flex items-center gap-1",
                                  isCourseSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
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
                                <span>{course.manager.name}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
