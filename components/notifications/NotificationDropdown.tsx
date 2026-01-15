"use client";

import { Check } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { notificationTranslations } from "@/lib/i18n/notifications";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { NotificationItem } from "./NotificationItem";

interface NotificationDropdownProps {
  language: "en" | "ja";
}

export function NotificationDropdown({ language }: NotificationDropdownProps) {
  const t = notificationTranslations[language];
  const {
    notifications,
    isLoading,
    hasMore,
    unreadCount,
    markAllAsRead,
    fetchNotifications,
  } = useNotificationStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      fetchNotifications();
    }
  }, [isLoading, hasMore, fetchNotifications]);

  return (
    <div className="flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">{t.title}</h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-1" />
              {t.markAllRead}
            </Button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {notifications.length === 0 && !isLoading ? (
          <NotificationEmptyState language={language} />
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                language={language}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <span className="text-sm text-muted-foreground">{t.loading}</span>
          </div>
        )}

        {!isLoading && hasMore && notifications.length > 0 && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNotifications()}
            >
              {t.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
