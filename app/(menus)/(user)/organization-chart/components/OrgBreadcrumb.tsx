"use client";

import type { Translations } from "../translations";

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

interface OrgBreadcrumbProps {
  organization: Organization | null;
  selection: Selection;
  onSelectNode: (
    type: "organization" | "department" | "section" | "course",
    id: string | null,
    name: string | null
  ) => void;
  t: Translations;
}

export function OrgBreadcrumb({
  organization,
  selection,
  onSelectNode,
  t,
}: OrgBreadcrumbProps) {
  if (!organization) return null;

  const breadcrumbs: { label: string; onClick: () => void }[] = [];

  // 組織（ルート）
  breadcrumbs.push({
    label: organization.name,
    onClick: () => onSelectNode("organization", null, null),
  });

  // 本部
  if (selection.departmentId && selection.departmentName) {
    breadcrumbs.push({
      label: selection.departmentName,
      onClick: () =>
        onSelectNode("department", selection.departmentId, selection.departmentName),
    });
  }

  // 部
  if (selection.sectionId && selection.sectionName) {
    breadcrumbs.push({
      label: selection.sectionName,
      onClick: () =>
        onSelectNode("section", selection.sectionId, selection.sectionName),
    });
  }

  // 課
  if (selection.courseId && selection.courseName) {
    breadcrumbs.push({
      label: selection.courseName,
      onClick: () =>
        onSelectNode("course", selection.courseId, selection.courseName),
    });
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-4">
      {breadcrumbs.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {index > 0 && (
            <svg
              className="w-4 h-4 mx-2 text-muted-foreground"
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
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <button
              type="button"
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
