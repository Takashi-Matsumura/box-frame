import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const variants: Record<Role, { className: string }> = {
    GUEST: { className: "bg-muted text-muted-foreground hover:bg-muted" },
    USER: { className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-900" },
    MANAGER: { className: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-200 dark:hover:bg-cyan-900" },
    ADMIN: { className: "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-900" },
  };

  return (
    <Badge variant="secondary" className={variants[role].className}>
      {role}
    </Badge>
  );
}
