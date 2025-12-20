"use client";

import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRoleChangerProps {
  userId: string;
  currentRole: Role;
  isCurrentUser: boolean;
  language?: string;
}

const getRoleColor = (role: Role) => {
  switch (role) {
    case "ADMIN":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-900";
    case "USER":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-900";
    case "MANAGER":
      return "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-900";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
};

export function UserRoleChanger({
  userId,
  currentRole,
  isCurrentUser,
  language = "en",
}: UserRoleChangerProps) {
  const [role, setRole] = useState<Role>(currentRole);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = async (newRole: Role) => {
    if (newRole === role) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        setRole(newRole);
        router.refresh();
      } else {
        alert(
          language === "ja"
            ? "ロールの変更に失敗しました"
            : "Failed to change role",
        );
      }
    } catch (_error) {
      alert(
        language === "ja"
          ? "ロールの変更中にエラーが発生しました"
          : "Error changing role",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isCurrentUser) {
    return (
      <Badge variant="secondary" className={getRoleColor(role)}>
        {role}
      </Badge>
    );
  }

  return (
    <Select
      value={role}
      onValueChange={(value) => handleRoleChange(value as Role)}
      disabled={isLoading}
    >
      <SelectTrigger className={`w-[120px] h-8 text-xs font-semibold border-0 ${getRoleColor(role)}`}>
        <SelectValue>{role}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="MANAGER">MANAGER</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
}
