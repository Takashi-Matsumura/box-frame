"use client";

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

interface MemberGridProps {
  employees: Employee[];
  loading: boolean;
  onSelectEmployee: (id: string) => void;
  t: Translations;
  language: Language;
}

export function MemberGrid({
  employees,
  loading,
  onSelectEmployee,
  t,
  language,
}: MemberGridProps) {
  // ローディング中
  if (loading) {
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
