"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

interface DayViewProps {
  language: "en" | "ja";
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
  externalEvents?: ExternalCalendarEvent[];
  calendarTab: "app" | "google";
  onBackToMonth: () => void;
  onDateChange: (date: string) => void;
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

export function DayView({
  language,
  date,
  events,
  externalEvents = [],
  calendarTab,
  onBackToMonth,
  onDateChange,
}: DayViewProps) {
  const t = dashboardTranslations[language];
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

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
      // App events have no time info -> all treated as all-day
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
          });
        }
      }
    }

    return { allDayEvents: allDay, timedEvents: timed };
  }, [date, events, externalEvents, calendarTab]);

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
      >
        <div
          className="relative"
          style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
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

            return (
              <div
                key={ev.id}
                className="absolute left-18 right-2 z-10 rounded px-2 py-1 text-white text-xs overflow-hidden cursor-default"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: ev.color,
                  minHeight: "24px",
                }}
                title={`${ev.title}\n${timeLabel}${ev.location ? `\n📍 ${ev.location}` : ""}`}
              >
                <div className="font-medium truncate">
                  {ev.htmlLink ? (
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
        </div>
      </div>
    </div>
  );
}
