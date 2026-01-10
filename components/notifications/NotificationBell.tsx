"use client";

import { Bell } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { NotificationDropdown } from "./NotificationDropdown";

interface NotificationBellProps {
  language: "en" | "ja";
}

export function NotificationBell({ language }: NotificationBellProps) {
  const { unreadCount, isOpen, setOpen, fetchUnreadCount, fetchNotifications } =
    useNotificationStore();

  // Fetch unread count on mount and poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (open) {
      fetchNotifications(true);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0"
        sideOffset={8}
      >
        <NotificationDropdown language={language} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
