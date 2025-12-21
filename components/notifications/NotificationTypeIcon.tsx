import {
  Bell,
  Shield,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationTypeIconProps {
  type: "SYSTEM" | "SECURITY" | "ACTION" | "INFO" | "WARNING" | "ERROR";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  className?: string;
}

const iconMap = {
  SYSTEM: Bell,
  SECURITY: Shield,
  ACTION: AlertCircle,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

const colorMap = {
  SYSTEM: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  SECURITY: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
  ACTION: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
  INFO: "text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30",
  WARNING: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30",
  ERROR: "text-red-500 bg-red-100 dark:bg-red-900/30",
};

export function NotificationTypeIcon({
  type,
  priority,
  className,
}: NotificationTypeIconProps) {
  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        colorMap[type],
        priority === "URGENT" && "ring-2 ring-red-500 ring-offset-2",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}
