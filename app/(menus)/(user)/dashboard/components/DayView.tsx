"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import type { ExternalCalendarEvent } from "@/lib/addon-modules/calendar-integration/types";
import { cn } from "@/lib/utils";
import { dashboardTranslations } from "../translations";
import type { CalendarEvent } from "./DashboardCalendar";

const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_HEIGHT = 60; // px per hour
const WORK_START = 9;
const WORK_END = 18;

interface AppCalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: string;
  color?: string;
}

interface DayViewProps {
  language: "en" | "ja";
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
  externalEvents?: ExternalCalendarEvent[];
  appEvents?: AppCalendarEvent[];
  calendarTab: "app" | "google";
  onBackToMonth: () => void;
  onDateChange: (date: string) => void;
  onCreateEvent?: (startHour: number, endHour: number) => void;
  onEventClick?: (event: AppCalendarEvent) => void;
  onGoogleEventClick?: (event: ExternalCalendarEvent) => void;
  googleHasWritePermission?: boolean;
}

interface TimeEvent {
  id: string;
  title: string;
  startHour: number; // fractional, e.g. 9.5 = 9:30
  endHour: number;
  description?: string;
  location?: string;
  htmlLink?: string;
  color: string;
  isAppEvent?: boolean;
  isGoogleEvent?: boolean;
}

function formatDateLabel(date: string, language: "en" | "ja"): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Category color mapping
const categoryColors: Record<string, string> = {
  personal: "#22c55e",
  visitor: "#a855f7",
  meeting: "#3b82f6",
  vacation: "#eab308",
  travel: "#f472b6",
};

export function DayView({
  language,
  date,
  events,
  externalEvents = [],
  appEvents = [],
  calendarTab,
  onBackToMonth,
  onDateChange,
  onCreateEvent,
  onEventClick,
  onGoogleEventClick,
  googleHasWritePermission = false,
}: DayViewProps) {
  const t = dashboardTranslations[language];
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time or 9:00 on mount
  useEffect(() => {
    if (timelineRef.current) {
      const isToday = date === todayStr();
      const scrollToHour = isToday
        ? Math.max(currentMinute / 60 - 1, START_HOUR)
        : WORK_START - 0.5;
      const scrollTop = (scrollToHour - START_HOUR) * HOUR_HEIGHT;
      timelineRef.current.scrollTop = scrollTop;
    }
    // Only scroll on date change, not on currentMinute updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // 15-minute snap function
  const snapToQuarter = useCallback((hour: number): number => {
    return Math.round(hour * 4) / 4; // 0.25 increments
  }, []);

  // Get hour from Y position
  const getHourFromY = useCallback((clientY: number): number => {
    if (!timelineRef.current) return START_HOUR;
    // Use the outer scrollable container for both rect and scrollTop
    // rect.top is stable (doesn't change with scroll)
    // scrollTop converts visible position to content position
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const relativeY = clientY - rect.top + scrollTop;
    const hour = START_HOUR + relativeY / HOUR_HEIGHT;
    return Math.max(START_HOUR, Math.min(END_HOUR, hour));
  }, []);

  // Check if drag selection is allowed
  const canCreateByDrag =
    calendarTab === "app" ||
    (calendarTab === "google" && googleHasWritePermission);

  // Mouse event handlers for drag selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left click on the timeline area (not on events)
      if (e.button !== 0 || !canCreateByDrag) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-event]")) return;

      const hour = getHourFromY(e.clientY);
      const snappedHour = snapToQuarter(hour);
      setIsDragging(true);
      setDragStart(snappedHour);
      setDragEnd(snappedHour + 0.25); // Minimum 15 minutes
      e.preventDefault();
    },
    [canCreateByDrag, getHourFromY, snapToQuarter],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const hour = getHourFromY(e.clientY);
      setDragEnd(snapToQuarter(hour));
    },
    [isDragging, getHourFromY, snapToQuarter],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      // Ensure minimum 15 minutes
      const adjustedEnd = end <= start ? start + 0.25 : end;
      onCreateEvent?.(start, adjustedEnd);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onCreateEvent]);

  // Handle mouse leave to cancel drag
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging]);

  // Separate events into all-day and timed
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: {
      id: string;
      title: string;
      color: string;
      description?: string;
    }[] = [];
    const timed: TimeEvent[] = [];

    if (calendarTab === "app") {
      // Demo events (no time info -> all treated as all-day)
      for (const ev of events) {
        if (
          ev.date === date ||
          (ev.endDate && date >= ev.date && date <= ev.endDate)
        ) {
          allDay.push({
            id: ev.id,
            title: ev.title,
            color: ev.color,
            description: ev.description,
          });
        }
      }

      // App calendar events (database events with time)
      for (const ev of appEvents) {
        // Parse date from ISO string (handle both "2026-02-03T16:00:00" and "2026-02-03T16:00:00.000Z")
        const evDate = ev.startTime.split("T")[0];
        if (evDate !== date) continue;

        if (ev.allDay) {
          allDay.push({
            id: ev.id,
            title: ev.title,
            color: ev.color || categoryColors[ev.category] || "#22c55e",
            description: ev.description,
          });
        } else {
          // Extract hours/minutes directly from ISO string to avoid timezone conversion
          // Format: "2026-02-03T16:30:00" or "2026-02-03T16:30:00.000Z"
          const startTimePart = ev.startTime.split("T")[1];
          const endTimePart = ev.endTime.split("T")[1];
          const [startH, startM] = startTimePart.split(":").map(Number);
          const [endH, endM] = endTimePart.split(":").map(Number);
          const startHour = startH + startM / 60;
          const endHour = endH + endM / 60;
          timed.push({
            id: ev.id,
            title: ev.title,
            startHour,
            endHour: endHour > startHour ? endHour : startHour + 0.5,
            description: ev.description,
            location: ev.location,
            color: ev.color || categoryColors[ev.category] || "#22c55e",
            isAppEvent: true,
          });
        }
      }
    } else {
      // Google events
      for (const ev of externalEvents) {
        const evStartDate = ev.allDay ? ev.start : ev.start.split("T")[0];
        const evEndDate =
          ev.allDay && ev.end
            ? (() => {
                const d = new Date(ev.end);
                d.setDate(d.getDate() - 1);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              })()
            : ev.end
              ? ev.end.split("T")[0]
              : evStartDate;

        if (date < evStartDate || date > evEndDate) continue;

        if (ev.allDay) {
          allDay.push({
            id: ev.id,
            title: ev.title,
            color: "#4285f4",
            description: ev.description,
          });
        } else {
          const start = new Date(ev.start);
          const end = new Date(ev.end);
          const startHour = start.getHours() + start.getMinutes() / 60;
          const endHour = end.getHours() + end.getMinutes() / 60;
          timed.push({
            id: ev.id,
            title: ev.title,
            startHour,
            endHour: endHour > startHour ? endHour : startHour + 0.5,
            description: ev.description,
            location: ev.location,
            htmlLink: ev.htmlLink,
            color: "#4285f4",
            isGoogleEvent: true,
          });
        }
      }
    }

    return { allDayEvents: allDay, timedEvents: timed };
  }, [date, events, externalEvents, appEvents, calendarTab]);

  const isToday = date === todayStr();
  const currentHourFraction = currentMinute / 60;
  const showTimeLine =
    isToday &&
    currentHourFraction >= START_HOUR &&
    currentHourFraction <= END_HOUR;
  const timeLineTop = (currentHourFraction - START_HOUR) * HOUR_HEIGHT;

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      result.push(h);
    }
    return result;
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onBackToMonth}>
          <RiArrowLeftLine className="w-4 h-4 mr-1" />
          {t.backToMonth}
        </Button>
        <h2 className="text-lg font-semibold">
          {formatDateLabel(date, language)}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(shiftDate(date, -1))}
            title={t.prevDay}
          >
            <RiArrowLeftSLine className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(todayStr())}
          >
            {t.todayButton}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(shiftDate(date, 1))}
            title={t.nextDay}
          >
            <RiArrowRightSLine className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="flex items-start gap-2 border-b pb-3 mb-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0 pt-1 text-right pr-2">
            {t.allDaySection}
          </span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {allDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="text-xs px-2 py-1 rounded text-white truncate max-w-[200px]"
                style={{ backgroundColor: ev.color }}
                title={ev.description || ev.title}
              >
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 430px)" }}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={timelineContainerRef}
          className={cn(
            "relative",
            canCreateByDrag && "cursor-crosshair",
          )}
          style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Hour lines */}
          {hours.map((hour) => {
            const top = (hour - START_HOUR) * HOUR_HEIGHT;
            const isWorkHour = hour >= WORK_START && hour < WORK_END;
            return (
              <div
                key={hour}
                className="absolute w-full flex items-start"
                style={{ top: `${top}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-xs text-muted-foreground w-16 shrink-0 text-right pr-2 -mt-2">
                  {`${hour}:00`}
                </span>
                <div
                  className={cn(
                    "flex-1 border-t h-full",
                    isWorkHour
                      ? "border-border bg-accent/20"
                      : "border-border/50",
                  )}
                />
              </div>
            );
          })}

          {/* Current time indicator */}
          {showTimeLine && (
            <div
              className="absolute left-16 right-0 z-20 pointer-events-none"
              style={{ top: `${timeLineTop}px` }}
            >
              <div className="relative">
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                <div className="h-0.5 bg-red-500 w-full" />
              </div>
            </div>
          )}

          {/* Timed events */}
          {timedEvents.map((ev) => {
            const top = (ev.startHour - START_HOUR) * HOUR_HEIGHT;
            const height = Math.max(
              (ev.endHour - ev.startHour) * HOUR_HEIGHT,
              24,
            );
            const startMin = Math.floor((ev.startHour % 1) * 60);
            const endMin = Math.floor((ev.endHour % 1) * 60);
            const timeLabel = `${Math.floor(ev.startHour)}:${String(startMin).padStart(2, "0")} - ${Math.floor(ev.endHour)}:${String(endMin).padStart(2, "0")}`;

            const handleEventClick = () => {
              if (ev.isAppEvent && onEventClick) {
                const appEvent = appEvents.find((e) => e.id === ev.id);
                if (appEvent) {
                  onEventClick(appEvent);
                }
              } else if (
                ev.isGoogleEvent &&
                googleHasWritePermission &&
                onGoogleEventClick
              ) {
                const googleEvent = externalEvents.find((e) => e.id === ev.id);
                if (googleEvent) {
                  onGoogleEventClick(googleEvent);
                }
              }
            };

            const isClickable =
              ev.isAppEvent ||
              (ev.isGoogleEvent && googleHasWritePermission);

            return (
              <div
                key={ev.id}
                data-event="true"
                className={cn(
                  "absolute left-18 right-2 z-10 rounded px-2 py-1 text-white text-xs overflow-hidden",
                  isClickable
                    ? "cursor-pointer hover:opacity-90"
                    : "cursor-default",
                )}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: ev.color,
                  minHeight: "24px",
                }}
                title={`${ev.title}\n${timeLabel}${ev.location ? `\n📍 ${ev.location}` : ""}`}
                onClick={handleEventClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleEventClick();
                  }
                }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <div className="font-medium truncate">
                  {ev.htmlLink && !googleHasWritePermission ? (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-white"
                    >
                      {ev.title}
                    </a>
                  ) : (
                    ev.title
                  )}
                </div>
                {height >= 40 && (
                  <div className="opacity-80 truncate">{timeLabel}</div>
                )}
                {height >= 56 && ev.location && (
                  <div className="opacity-80 truncate">📍 {ev.location}</div>
                )}
              </div>
            );
          })}

          {/* Drag selection highlight */}
          {isDragging &&
            dragStart !== null &&
            dragEnd !== null &&
            (() => {
              const selStart = Math.min(dragStart, dragEnd);
              const selEnd = Math.max(dragStart, dragEnd);
              const top = (selStart - START_HOUR) * HOUR_HEIGHT;
              const height = Math.max(
                (selEnd - selStart) * HOUR_HEIGHT,
                HOUR_HEIGHT / 4,
              );
              const startMin = Math.floor((selStart % 1) * 60);
              const endMin = Math.floor((selEnd % 1) * 60);
              const timeLabel = `${Math.floor(selStart)}:${String(startMin).padStart(2, "0")} - ${Math.floor(selEnd)}:${String(endMin).padStart(2, "0")}`;

              return (
                <div
                  className="absolute left-18 right-2 z-30 rounded border-2 border-blue-500 bg-blue-500/30 pointer-events-none"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                  }}
                >
                  <div className="absolute -top-5 left-0 text-xs font-medium text-blue-600 bg-white/90 px-1 rounded shadow-sm">
                    {timeLabel}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Drag hint (app tab or google with write permission) */}
      {canCreateByDrag && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          {calendarTab === "google" ? t.googleDragToCreate : t.dragToCreate}
        </div>
      )}
    </div>
  );
}
