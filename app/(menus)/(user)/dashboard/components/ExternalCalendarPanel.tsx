"use client";

import { useCallback, useEffect, useState } from "react";
import { RiGoogleFill, RiLinkUnlinkM, RiSettings3Line } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExternalCalendarEvent } from "@/lib/addon-modules/calendar-integration/types";
import { dashboardTranslations } from "../translations";

interface Connection {
  id: string;
  provider: string;
  email: string | null;
  isActive: boolean;
}

interface ExternalCalendarPanelProps {
  language: "en" | "ja";
  activeTab: "app" | "google";
  onTabChange: (tab: "app" | "google") => void;
  externalEvents: ExternalCalendarEvent[];
  onExternalEventsChange: (events: ExternalCalendarEvent[]) => void;
  currentYear: number;
  currentMonth: number;
}

export function ExternalCalendarPanel({
  language,
  activeTab,
  onTabChange,
  externalEvents,
  onExternalEventsChange,
  currentYear,
  currentMonth,
}: ExternalCalendarPanelProps) {
  const t = dashboardTranslations[language];
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const googleConnection = connections.find((c) => c.provider === "google");

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Fetch external events when tab is google and connection exists
  const fetchExternalEvents = useCallback(async () => {
    if (!googleConnection) return;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const timeMin = firstDay.toISOString();
    const timeMax = new Date(
      lastDay.getFullYear(),
      lastDay.getMonth(),
      lastDay.getDate(),
      23,
      59,
      59,
    ).toISOString();

    try {
      const res = await fetch(
        `/api/calendar/events?provider=google&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      );
      if (res.ok) {
        const data = await res.json();
        onExternalEventsChange(data.events);
      }
    } catch {
      // ignore
    }
  }, [googleConnection, currentYear, currentMonth, onExternalEventsChange]);

  useEffect(() => {
    if (googleConnection) {
      fetchExternalEvents();
    }
  }, [googleConnection, fetchExternalEvents]);

  // Check URL params for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "google") {
      fetchConnections();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("calendar_connected");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [fetchConnections]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/calendar/connect/google", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch {
      // ignore
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
      if (res.ok) {
        setConnections((prev) =>
          prev.filter((c) => c.provider !== "google"),
        );
        onExternalEventsChange([]);
        onTabChange("app");
        setShowSettings(false);
      }
    } catch {
      // ignore
    }
  }, [onExternalEventsChange, onTabChange]);

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Tab buttons */}
      <div className="flex items-center rounded-lg bg-muted p-0.5">
        <button
          type="button"
          onClick={() => onTabChange("app")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            activeTab === "app"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.calendarTabApp}
        </button>
        {googleConnection ? (
          <button
            type="button"
            onClick={() => onTabChange("google")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
              activeTab === "google"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <RiGoogleFill className="w-3 h-3" />
            Google
          </button>
        ) : null}
      </div>

      {/* Connect / Settings */}
      {!googleConnection ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnect}
          disabled={connecting}
          className="text-xs gap-1"
        >
          <RiGoogleFill className="w-3.5 h-3.5" />
          {connecting ? t.calendarConnecting : t.calendarConnectGoogle}
        </Button>
      ) : (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-7 w-7 p-0"
          >
            <RiSettings3Line className="w-3.5 h-3.5" />
          </Button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-md p-3 min-w-[200px]">
              <div className="text-xs text-muted-foreground mb-2">
                {googleConnection.email || "Google Calendar"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="w-full text-xs gap-1 text-destructive hover:text-destructive"
              >
                <RiLinkUnlinkM className="w-3.5 h-3.5" />
                {t.calendarDisconnect}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
