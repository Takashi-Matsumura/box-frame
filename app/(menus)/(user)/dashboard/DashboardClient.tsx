"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExternalCalendarEvent } from "@/lib/addon-modules/calendar-integration/types";
import {
  DashboardCalendar,
  type CalendarEvent,
} from "./components/DashboardCalendar";
import { ExternalCalendarPanel } from "./components/ExternalCalendarPanel";
import { dashboardTranslations } from "./translations";

interface DashboardClientProps {
  language: "en" | "ja";
  userRole: string;
  userName: string;
}

// ダミーイベント（後でAPIデータに置き換え）
const DEMO_EVENTS: CalendarEvent[] = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (month: number, day: number) =>
    `${y}-${pad(month + 1)}-${pad(day)}`;

  return [
    {
      id: "demo-1",
      title: "Mid-year evaluation deadline",
      date: dateStr(m, 15),
      category: "evaluation",
      color: "#eab308",
      description: "Submit your mid-year self-evaluation",
    },
    {
      id: "demo-2",
      title: "1-on-1 meeting",
      date: dateStr(m, 18),
      category: "interview",
      color: "#a855f7",
      description: "Manager 1-on-1",
    },
    {
      id: "demo-3",
      title: "All-hands meeting",
      date: dateStr(m, 10),
      category: "company",
      color: "#3b82f6",
      description: "Monthly all-hands",
    },
    {
      id: "demo-4",
      title: "Team lunch",
      date: dateStr(m, 22),
      category: "personal",
      color: "#22c55e",
    },
    {
      id: "demo-5",
      title: "Tanaka-san's birthday",
      date: dateStr(m, 25),
      category: "birthday",
      color: "#f472b6",
    },
    {
      id: "demo-6",
      title: "Evaluation period",
      date: dateStr(m, 1),
      endDate: dateStr(m, 5),
      category: "evaluation",
      color: "#eab308",
      description: "Evaluation review period",
    },
  ];
})();

const categoryConfig: {
  key: CalendarEvent["category"];
  colorClass: string;
}[] = [
  { key: "evaluation", colorClass: "bg-yellow-400" },
  { key: "interview", colorClass: "bg-purple-500" },
  { key: "company", colorClass: "bg-blue-500" },
  { key: "personal", colorClass: "bg-green-500" },
  { key: "birthday", colorClass: "bg-pink-400" },
];

const categoryTranslationKeys: Record<CalendarEvent["category"], string> = {
  evaluation: "categoryEvaluation",
  interview: "categoryInterview",
  company: "categoryCompany",
  personal: "categoryPersonal",
  birthday: "categoryBirthday",
};

// Convert external calendar events to CalendarEvent format for display
function externalToCalendarEvents(
  events: ExternalCalendarEvent[],
): CalendarEvent[] {
  return events.map((e) => {
    const startDate = e.allDay
      ? e.start
      : e.start.split("T")[0];
    const endDate = e.allDay && e.end
      ? // Google all-day events have exclusive end date, subtract 1 day
        (() => {
          const d = new Date(e.end);
          d.setDate(d.getDate() - 1);
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yy}-${mm}-${dd}`;
        })()
      : e.end
        ? e.end.split("T")[0]
        : undefined;

    return {
      id: `ext-${e.id}`,
      title: e.title,
      date: startDate,
      endDate: endDate !== startDate ? endDate : undefined,
      category: "company" as const,
      color: "#4285f4", // Google blue
      description: e.description || (e.location ? `📍 ${e.location}` : undefined),
    };
  });
}

export function DashboardClient({
  language,
  userRole,
  userName,
}: DashboardClientProps) {
  const t = dashboardTranslations[language];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarTab, setCalendarTab] = useState<"app" | "google">("app");
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>(
    [],
  );
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }));

  const handleExternalEventsChange = useCallback(
    (events: ExternalCalendarEvent[]) => {
      setExternalEvents(events);
    },
    [],
  );

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCalendarMonth({ year, month });
  }, []);

  const convertedExternalEvents = useMemo(
    () => externalToCalendarEvents(externalEvents),
    [externalEvents],
  );

  const displayEvents =
    calendarTab === "app" ? DEMO_EVENTS : convertedExternalEvents;

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return displayEvents.filter((event) => {
      if (event.date === selectedDate) return true;
      if (
        event.endDate &&
        selectedDate >= event.date &&
        selectedDate <= event.endDate
      )
        return true;
      return false;
    });
  }, [selectedDate, displayEvents]);

  const selectedDayExternalDetails = useMemo(() => {
    if (!selectedDate || calendarTab !== "google") return [];
    return externalEvents.filter((e) => {
      const startDate = e.allDay ? e.start : e.start.split("T")[0];
      const endDate = e.end
        ? e.allDay
          ? (() => {
              const d = new Date(e.end);
              d.setDate(d.getDate() - 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })()
          : e.end.split("T")[0]
        : startDate;
      return selectedDate >= startDate && selectedDate <= endDate;
    });
  }, [selectedDate, calendarTab, externalEvents]);

  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Welcome Banner (compact) */}
      <Card className="bg-primary border-0">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-primary-foreground">
            <div>
              <h1 className="text-xl font-bold">
                {t.welcomeBack}, {userName}!
              </h1>
              <p className="opacity-80 text-sm">
                {t.roleLabel}: <span className="font-semibold">{userRole}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="opacity-70 text-xs">{t.today}</p>
                <p className="text-base font-semibold">
                  {new Date().toLocaleDateString(
                    language === "ja" ? "ja-JP" : "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Tab + External Calendar Panel */}
      <div className="flex items-center justify-between">
        <ExternalCalendarPanel
          language={language}
          activeTab={calendarTab}
          onTabChange={setCalendarTab}
          externalEvents={externalEvents}
          onExternalEventsChange={handleExternalEventsChange}
          currentYear={calendarMonth.year}
          currentMonth={calendarMonth.month}
        />
      </div>

      {/* Calendar + Event Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar */}
        <Card>
          <CardContent className="pt-6">
            <DashboardCalendar
              language={language}
              events={displayEvents}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              onMonthChange={handleMonthChange}
            />
          </CardContent>
        </Card>

        {/* Selected day events panel */}
        <Card>
          <CardContent className="pt-6">
            {selectedDate ? (
              <div>
                <h3 className="font-semibold text-sm mb-1">
                  {formatSelectedDate(selectedDate)}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t.selectedDayEvents}
                </p>
                {calendarTab === "google" && selectedDayExternalDetails.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayExternalDetails.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {event.htmlLink ? (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {event.title}
                              </a>
                            ) : (
                              event.title
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.allDay
                              ? t.calendarAllDay
                              : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              📍 {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : calendarTab === "app" && selectedDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            categoryConfig.find((c) => c.key === event.category)
                              ?.colorClass,
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {
                              t[
                                categoryTranslationKeys[
                                  event.category
                                ] as keyof typeof t
                              ]
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.noEvents}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                <p className="text-sm">{t.selectDatePrompt}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      {calendarTab === "app" && (
        <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
          {categoryConfig.map(({ key, colorClass }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
              <span>
                {t[categoryTranslationKeys[key] as keyof typeof t]}
              </span>
            </div>
          ))}
        </div>
      )}
      {calendarTab === "google" && (
        <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Google Calendar</span>
          </div>
        </div>
      )}
    </div>
  );
}
