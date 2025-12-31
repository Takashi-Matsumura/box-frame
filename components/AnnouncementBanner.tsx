"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  titleJa?: string;
  message: string;
  messageJa?: string;
  level: string;
}

interface AnnouncementBannerProps {
  language?: "en" | "ja";
}

const levelStyles = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    icon: AlertCircle,
  },
};

export function AnnouncementBanner({ language = "ja" }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();

    // 5分ごとに更新
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  // 非表示にしたアナウンスを除外
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.has(a.id)
  );

  if (isLoading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleAnnouncements.map((announcement) => {
        const style =
          levelStyles[announcement.level as keyof typeof levelStyles] ||
          levelStyles.info;
        const Icon = style.icon;
        const title =
          language === "ja" && announcement.titleJa
            ? announcement.titleJa
            : announcement.title;
        const message =
          language === "ja" && announcement.messageJa
            ? announcement.messageJa
            : announcement.message;

        return (
          <div
            key={announcement.id}
            className={`${style.bg} ${style.border} ${style.text} border-b px-4 py-2 flex items-center gap-3`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{title}</span>
              {message && (
                <span className="ml-2 text-sm opacity-90">{message}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${style.text} hover:bg-black/10 dark:hover:bg-white/10`}
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">
                {language === "ja" ? "閉じる" : "Dismiss"}
              </span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
