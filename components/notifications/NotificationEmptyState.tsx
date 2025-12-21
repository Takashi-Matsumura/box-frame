"use client";

import { Bell } from "lucide-react";
import { notificationTranslations } from "@/lib/i18n/notifications";

interface NotificationEmptyStateProps {
  language: "en" | "ja";
}

export function NotificationEmptyState({
  language,
}: NotificationEmptyStateProps) {
  const t = notificationTranslations[language];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {t.noNotifications}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
        {t.noNotificationsDescription}
      </p>
    </div>
  );
}
