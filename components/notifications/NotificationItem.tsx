"use client";

import { formatDistanceToNow } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useNotificationStore,
  type Notification,
} from "@/lib/stores/notification-store";
import { NotificationTypeIcon } from "./NotificationTypeIcon";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  language: "en" | "ja";
}

export function NotificationItem({
  notification,
  language,
}: NotificationItemProps) {
  const { markAsRead, deleteNotification, setOpen } = useNotificationStore();

  const title =
    language === "ja" && notification.titleJa
      ? notification.titleJa
      : notification.title;
  const message =
    language === "ja" && notification.messageJa
      ? notification.messageJa
      : notification.message;

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: language === "ja" ? ja : enUS,
  });

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      setOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const content = (
    <div
      className={cn(
        "relative flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group",
        !notification.isRead && "bg-accent/30"
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <NotificationTypeIcon
          type={notification.type}
          priority={notification.priority}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={handleDelete}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {content}
    </div>
  );
}
