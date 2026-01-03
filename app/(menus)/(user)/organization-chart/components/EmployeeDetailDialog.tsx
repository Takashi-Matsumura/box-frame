"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Translations, Language } from "../translations";

interface Manager {
  id: string;
  name: string;
  position: string;
}

interface EmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  positionCode: string | null;
  qualificationGrade: string | null;
  qualificationGradeCode: string | null;
  employmentType: string | null;
  employmentTypeCode: string | null;
  organization: { id: string; name: string } | null;
  department: { id: string; name: string; code: string | null; manager: Manager | null } | null;
  section: { id: string; name: string; code: string | null; manager: Manager | null } | null;
  course: { id: string; name: string; code: string | null; manager: Manager | null } | null;
  joinDate: string | null;
  birthDate: string | null;
  isActive: boolean;
}

interface EmployeeDetailDialogProps {
  employeeId: string | null;
  onClose: () => void;
  t: Translations;
  language: Language;
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

// 日付フォーマット
function formatDate(dateStr: string | null, language: Language): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (language === "ja") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function EmployeeDetailDialog({
  employeeId,
  onClose,
  t,
  language,
}: EmployeeDetailDialogProps) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      return;
    }

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/organization/employees/${employeeId}`);
        if (!response.ok) throw new Error("Failed to fetch employee");
        const data = await response.json();
        setEmployee(data.employee);
      } catch (err) {
        setError(t.error);
        console.error("Error fetching employee:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, t.error]);

  return (
    <Dialog open={!!employeeId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.employeeDetails}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {employee && !loading && (
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {employee.name}
                </h2>
                {employee.nameKana && (
                  <p className="text-sm text-muted-foreground">
                    {employee.nameKana}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={cn("text-xs", getPositionColor(employee.position))}
                  >
                    {employee.position}
                  </Badge>
                  <Badge
                    variant={employee.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {employee.isActive ? t.active : t.inactive}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* 基本情報 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t.basicInfo}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t.employeeId}</dt>
                <dd className="text-foreground">{employee.employeeId}</dd>

                {employee.qualificationGrade && (
                  <>
                    <dt className="text-muted-foreground">{t.qualificationGrade}</dt>
                    <dd className="text-foreground">{employee.qualificationGrade}</dd>
                  </>
                )}

                {employee.employmentType && (
                  <>
                    <dt className="text-muted-foreground">{t.employmentType}</dt>
                    <dd className="text-foreground">{employee.employmentType}</dd>
                  </>
                )}
              </dl>
            </div>

            <Separator />

            {/* 所属情報 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t.affiliation}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {employee.department && (
                  <>
                    <dt className="text-muted-foreground">{t.department}</dt>
                    <dd className="text-foreground">
                      <div>{employee.department.name}</div>
                      {employee.department.manager && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {employee.department.manager.name}
                          <span className="opacity-70">({employee.department.manager.position})</span>
                        </div>
                      )}
                    </dd>
                  </>
                )}

                {employee.section && (
                  <>
                    <dt className="text-muted-foreground">{t.section}</dt>
                    <dd className="text-foreground">
                      <div>{employee.section.name}</div>
                      {employee.section.manager && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {employee.section.manager.name}
                          <span className="opacity-70">({employee.section.manager.position})</span>
                        </div>
                      )}
                    </dd>
                  </>
                )}

                {employee.course && (
                  <>
                    <dt className="text-muted-foreground">{t.course}</dt>
                    <dd className="text-foreground">
                      <div>{employee.course.name}</div>
                      {employee.course.manager && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {employee.course.manager.name}
                          <span className="opacity-70">({employee.course.manager.position})</span>
                        </div>
                      )}
                    </dd>
                  </>
                )}
              </dl>
            </div>

            <Separator />

            {/* 連絡先情報 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t.contactInfo}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t.email}</dt>
                <dd className="text-foreground">
                  {employee.email ? (
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-primary hover:underline"
                    >
                      {employee.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>

                <dt className="text-muted-foreground">{t.phone}</dt>
                <dd className="text-foreground">
                  {employee.phone ? (
                    <a
                      href={`tel:${employee.phone}`}
                      className="text-primary hover:underline"
                    >
                      {employee.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </dl>
            </div>

            <Separator />

            {/* その他情報 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t.otherInfo}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t.joinDate}</dt>
                <dd className="text-foreground">
                  {formatDate(employee.joinDate, language)}
                </dd>
              </dl>
            </div>

            {/* 閉じるボタン */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                {t.close}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
