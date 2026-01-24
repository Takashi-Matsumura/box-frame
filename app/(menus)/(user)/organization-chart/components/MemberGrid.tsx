"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Language, Translations } from "../translations";
import { MemberCard } from "./MemberCard";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  isActive: boolean;
  joinDate: string | null;
}

export type ViewMode = "grid" | "list";

interface MemberGridProps {
  employees: Employee[];
  loading: boolean;
  onSelectEmployee: (id: string) => void;
  t: Translations;
  language: Language;
  viewMode?: ViewMode;
}

// 役職に基づいて色を決定
function getPositionColor(position: string): string {
  if (position.includes("本部長") || position.includes("部長")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  }
  if (position.includes("課長") || position.includes("マネージャー")) {
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
  }
  if (position.includes("主任") || position.includes("リーダー")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  return "bg-muted text-muted-foreground";
}

// 名前からイニシャルを取得
function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0);
  }
  return name.slice(0, 2);
}

export function MemberGrid({
  employees,
  loading,
  onSelectEmployee,
  t,
  language,
  viewMode = "grid",
}: MemberGridProps) {
  // ローディング中
  if (loading) {
    if (viewMode === "list") {
      return (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-lg h-14" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-muted animate-pulse rounded-lg h-32" />
        ))}
      </div>
    );
  }

  // データなし
  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-foreground mb-1">
          {t.noEmployees}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t.noEmployeesDescription}
        </p>
      </div>
    );
  }

  // リストビュー
  if (viewMode === "list") {
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t.name}</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                {t.position}
              </th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                {t.affiliation}
              </th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">
                {t.email}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => onSelectEmployee(employee.id)}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  !employee.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {employee.name}
                        </span>
                        {!employee.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            {t.inactive}
                          </Badge>
                        )}
                      </div>
                      {employee.nameKana && (
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.nameKana}
                        </p>
                      )}
                      {/* モバイル用: 役職表示 */}
                      <div className="sm:hidden mt-1">
                        <Badge
                          className={cn(
                            "text-xs",
                            getPositionColor(employee.position),
                          )}
                        >
                          {employee.position}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge
                    className={cn(
                      "text-xs",
                      getPositionColor(employee.position),
                    )}
                  >
                    {employee.position}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {[
                      employee.department?.name,
                      employee.section?.name,
                      employee.course?.name,
                    ]
                      .filter(Boolean)
                      .join(" > ")}
                  </p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {employee.email && (
                    <a
                      href={`mailto:${employee.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block max-w-[200px]"
                    >
                      {employee.email}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // グリッドビュー（デフォルト）
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {employees.map((employee) => (
        <MemberCard
          key={employee.id}
          employee={employee}
          onClick={() => onSelectEmployee(employee.id)}
          t={t}
          language={language}
        />
      ))}
    </div>
  );
}
