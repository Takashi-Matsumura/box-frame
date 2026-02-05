"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardTranslations } from "../translations";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // 期間イベント用
  category: "personal" | "visitor" | "meeting" | "vacation" | "travel";
  color: string;
  description?: string;
  actionUrl?: string;
}

export interface HolidayData {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  nameEn?: string;
  type: string; // national, company
}

const categoryColors: Record<CalendarEvent["category"], string> = {
  personal: "bg-green-500",
  visitor: "bg-purple-500",
  meeting: "bg-blue-500",
  vacation: "bg-yellow-400",
  travel: "bg-pink-400",
};

export type CalendarViewMode = "month" | "day";

interface DashboardCalendarProps {
  language: "en" | "ja";
  events: CalendarEvent[];
  holidays?: HolidayData[];
  onDateSelect?: (date: string) => void;
  selectedDate: string | null;
  onMonthChange?: (year: number, month: number) => void;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
}

export function DashboardCalendar({
  language,
  events,
  holidays = [],
  onDateSelect,
  selectedDate,
  onMonthChange,
  viewMode = "month",
  onViewModeChange,
}: DashboardCalendarProps) {
  const t = dashboardTranslations[language];
  const today = new Date();
  const todayStr = formatDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Notify parent of month changes via useEffect to avoid setState-during-render
  useEffect(() => {
    onMonthChange?.(currentYear, currentMonth);
  }, [currentYear, currentMonth, onMonthChange]);

  const weekDays = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onDateSelect?.(
      formatDateStr(now.getFullYear(), now.getMonth(), now.getDate()),
    );
  }, [onDateSelect]);

  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const result: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      result.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(i);
    }
    return result;
  }, [currentYear, currentMonth]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);

      // Handle range events
      if (event.endDate && event.endDate > event.date) {
        const start = new Date(event.date);
        const end = new Date(event.endDate);
        const cursor = new Date(start);
        cursor.setDate(cursor.getDate() + 1);
        while (cursor <= end) {
          const dateStr = formatDateStr(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
          );
          const dayEvents = map.get(dateStr) || [];
          dayEvents.push(event);
          map.set(dateStr, dayEvents);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    return map;
  }, [events]);

  // Build holidays map for quick lookup
  const holidaysMap = useMemo(() => {
    const map = new Map<string, HolidayData>();
    for (const holiday of holidays) {
      map.set(holiday.date, holiday);
    }
    return map;
  }, [holidays]);

  const handleDateClick = useCallback(
    (day: number) => {
      const dateStr = formatDateStr(currentYear, currentMonth, day);
      onDateSelect?.(dateStr);
    },
    [currentYear, currentMonth, onDateSelect],
  );

  const handleDateDoubleClick = useCallback(
    (day: number) => {
      const dateStr = formatDateStr(currentYear, currentMonth, day);
      onDateSelect?.(dateStr);
      onViewModeChange?.("day");
    },
    [currentYear, currentMonth, onDateSelect, onViewModeChange],
  );

  const monthLabel =
    language === "ja"
      ? `${currentYear}年 ${t.monthNames[currentMonth]}`
      : `${t.monthNames[currentMonth]} ${currentYear}`;

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <RiArrowLeftSLine className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <RiArrowRightSLine className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* 月/日切り替え - デスクトップのみ */}
          <div className="hidden lg:flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => onViewModeChange?.("month")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {t.viewMonth}
            </button>
            <button
              type="button"
              onClick={() => {
                const dateToUse =
                  selectedDate ||
                  formatDateStr(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );
                onDateSelect?.(dateToUse);
                onViewModeChange?.("day");
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors border-l",
                viewMode === "day"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {t.viewDay}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <RiCalendarLine className="w-4 h-4 mr-1" />
            {t.todayButton}
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-2",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-20" />;
          }

          const dateStr = formatDateStr(currentYear, currentMonth, day);
          const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventsMap.get(dateStr) || [];
          const holiday = holidaysMap.get(dateStr);
          const isHoliday = !!holiday;
          // Deduplicate by category for dots
          const uniqueCategories = [
            ...new Set(dayEvents.map((e) => e.category)),
          ];

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              onDoubleClick={() => handleDateDoubleClick(day)}
              className={cn(
                "h-20 w-full rounded-lg text-sm relative transition-colors p-1 text-left flex flex-col",
                "hover:bg-accent/50 cursor-pointer",
                "border border-gray-200 dark:border-transparent",
                (dayOfWeek === 0 || isHoliday) && "text-red-500",
                dayOfWeek === 6 && !isHoliday && "text-blue-500",
                isToday && "bg-primary/5 border-primary",
                isSelected &&
                  !isToday &&
                  "bg-accent border-accent-foreground/20",
                isSelected && isToday && "bg-primary/10 border-primary",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {day}
              </span>
              {/* Holiday name */}
              {holiday && (
                <span className="text-[10px] text-red-500 leading-tight truncate w-full">
                  {language === "ja" ? holiday.name : (holiday.nameEn || holiday.name)}
                </span>
              )}
              {/* Event dots */}
              {uniqueCategories.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {uniqueCategories.slice(0, 4).map((category) => (
                    <div
                      key={category}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        categoryColors[category],
                      )}
                    />
                  ))}
                  {uniqueCategories.length > 4 && (
                    <span className="text-[10px] text-muted-foreground leading-none">
                      +{uniqueCategories.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
