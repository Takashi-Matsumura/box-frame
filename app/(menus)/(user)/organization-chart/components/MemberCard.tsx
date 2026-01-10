"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Language, Translations } from "../translations";

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

interface MemberCardProps {
  employee: Employee;
  onClick: () => void;
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

export function MemberCard({
  employee,
  onClick,
  t,
  language,
}: MemberCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        !employee.isActive && "opacity-60",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* アバター */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            {/* 名前 */}
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {employee.name}
              </h3>
              {!employee.isActive && (
                <Badge variant="secondary" className="text-xs">
                  {t.inactive}
                </Badge>
              )}
            </div>

            {/* フリガナ */}
            {employee.nameKana && (
              <p className="text-xs text-muted-foreground truncate">
                {employee.nameKana}
              </p>
            )}

            {/* 役職 */}
            <Badge
              className={cn(
                "mt-1 text-xs",
                getPositionColor(employee.position),
              )}
            >
              {employee.position}
            </Badge>

            {/* 所属（コンパクト表示） */}
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {[
                employee.department?.name,
                employee.section?.name,
                employee.course?.name,
              ]
                .filter(Boolean)
                .join(" > ")}
            </p>

            {/* 連絡先アイコン */}
            <div className="flex items-center gap-2 mt-2">
              {employee.email && (
                <a
                  href={`mailto:${employee.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={employee.email}
                >
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </a>
              )}
              {employee.phone && (
                <a
                  href={`tel:${employee.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={employee.phone}
                >
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
