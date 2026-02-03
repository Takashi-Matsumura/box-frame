"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiCalendarEventLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiSparklingLine,
} from "react-icons/ri";
import { Card, CardContent } from "@/components/ui/card";
import type { ExternalCalendarEvent } from "@/lib/addon-modules/calendar-integration/types";
import { cn } from "@/lib/utils";
import { CalendarConcierge } from "./components/CalendarConcierge";
import {
  type CalendarEvent,
  type CalendarViewMode,
  DashboardCalendar,
} from "./components/DashboardCalendar";
import { DayView } from "./components/DayView";
import {
  type CreateEventData,
  EventCreateDialog,
} from "./components/EventCreateDialog";
import {
  type EditEventData,
  type EventToEdit,
  EventEditDialog,
} from "./components/EventEditDialog";
import { ExternalCalendarPanel } from "./components/ExternalCalendarPanel";
import { dashboardTranslations } from "./translations";

// App calendar event type from database
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

interface DashboardClientProps {
  language: "en" | "ja";
  userRole: string;
  userName: string;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const categoryConfig: {
  key: CalendarEvent["category"];
  colorClass: string;
}[] = [
  { key: "personal", colorClass: "bg-green-500" },
  { key: "visitor", colorClass: "bg-purple-500" },
  { key: "meeting", colorClass: "bg-blue-500" },
  { key: "vacation", colorClass: "bg-yellow-400" },
  { key: "travel", colorClass: "bg-pink-400" },
];

const categoryTranslationKeys: Record<CalendarEvent["category"], string> = {
  personal: "categoryPersonal",
  visitor: "categoryVisitor",
  meeting: "categoryMeeting",
  vacation: "categoryVacation",
  travel: "categoryTravel",
};

// Convert external calendar events to CalendarEvent format for display
function externalToCalendarEvents(
  events: ExternalCalendarEvent[],
): CalendarEvent[] {
  return events.map((e) => {
    const startDate = e.allDay ? e.start : e.start.split("T")[0];
    const endDate =
      e.allDay && e.end
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
      category: "meeting" as const,
      color: "#4285f4", // Google blue
      description:
        e.description || (e.location ? `📍 ${e.location}` : undefined),
    };
  });
}

// Convert app calendar events to CalendarEvent format for month view
function appToCalendarEvents(events: AppCalendarEvent[]): CalendarEvent[] {
  return events.map((e) => {
    // Extract date from ISO string (YYYY-MM-DD part)
    const startDate = e.startTime.split("T")[0];
    const endDate = e.endTime.split("T")[0];

    return {
      id: e.id,
      title: e.title,
      date: startDate,
      endDate: endDate !== startDate ? endDate : undefined,
      category: (e.category as CalendarEvent["category"]) || "personal",
      color: e.color || "#22c55e",
      description: e.description,
    };
  });
}

export function DashboardClient({
  language,
  userRole,
  userName,
}: DashboardClientProps) {
  const t = dashboardTranslations[language];
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [calendarTab, setCalendarTab] = useState<"app" | "google">("app");
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>(
    [],
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [rightPanelTab, setRightPanelTab] = useState<"events" | "concierge">(
    "events",
  );
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }));

  // App calendar events from database
  const [appEvents, setAppEvents] = useState<AppCalendarEvent[]>([]);
  const [, setIsLoadingEvents] = useState(false);

  // Google Calendar write permission state
  const [googleHasWritePermission, setGoogleHasWritePermission] =
    useState(false);

  // Event creation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStartHour, setCreateDialogStartHour] = useState(9);
  const [createDialogEndHour, setCreateDialogEndHour] = useState(10);

  // Event edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventToEdit | null>(null);

  // Google event edit state (reuse same dialog with different handler)
  const [isEditingGoogleEvent, setIsEditingGoogleEvent] = useState(false);

  const handleExternalEventsChange = useCallback(
    (events: ExternalCalendarEvent[]) => {
      setExternalEvents(events);
    },
    [],
  );

  const handleGoogleWritePermissionChange = useCallback(
    (hasPermission: boolean) => {
      setGoogleHasWritePermission(hasPermission);
    },
    [],
  );

  // Refetch Google events
  const refetchGoogleEvents = useCallback(async () => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1);
    const lastDay = new Date(calendarMonth.year, calendarMonth.month + 1, 0);
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
        setExternalEvents(data.events);
      }
    } catch {
      // ignore
    }
  }, [calendarMonth.year, calendarMonth.month]);

  // Fetch app calendar events
  const fetchAppEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      // Fetch events for current month +/- 1 month
      const startDate = new Date(
        calendarMonth.year,
        calendarMonth.month - 1,
        1,
      );
      const endDate = new Date(calendarMonth.year, calendarMonth.month + 2, 0);
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

      const res = await fetch(
        `/api/calendar/app-events?startDate=${startStr}&endDate=${endStr}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAppEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch app events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [calendarMonth.year, calendarMonth.month]);

  // Fetch events when month changes
  useEffect(() => {
    fetchAppEvents();
  }, [fetchAppEvents]);

  // Handle event creation from DayView drag
  const handleCreateEvent = useCallback(
    (startHour: number, endHour: number) => {
      setCreateDialogStartHour(startHour);
      setCreateDialogEndHour(endHour);
      setCreateDialogOpen(true);
    },
    [],
  );

  // Save event to database
  const handleSaveEvent = useCallback(
    async (eventData: CreateEventData) => {
      const res = await fetch("/api/calendar/app-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error("Failed to create event");
      }

      // Refresh events
      await fetchAppEvents();
    },
    [fetchAppEvents],
  );

  // Handle event click (for editing - future feature)
  const handleEventClick = useCallback((event: AppCalendarEvent) => {
    // TODO: Open edit dialog
    console.log("Event clicked:", event);
  }, []);

  // Delete event
  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!confirm(t.eventDeleteConfirm)) return;

      try {
        const res = await fetch(`/api/calendar/app-events/${eventId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete event");
        }

        // Refresh events
        await fetchAppEvents();
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    },
    [t.eventDeleteConfirm, fetchAppEvents],
  );

  // Open edit dialog
  const handleEditEvent = useCallback((event: AppCalendarEvent) => {
    setIsEditingGoogleEvent(false);
    setEventToEdit({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      category: event.category,
    });
    setEditDialogOpen(true);
  }, []);

  // Save edited event
  const handleSaveEditedEvent = useCallback(
    async (eventId: string, eventData: EditEventData) => {
      if (isEditingGoogleEvent) {
        // Google event update
        const res = await fetch(`/api/calendar/google-events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (!res.ok) {
          throw new Error("Failed to update Google event");
        }

        // Refresh Google events
        await refetchGoogleEvents();
      } else {
        // App event update
        const res = await fetch(`/api/calendar/app-events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (!res.ok) {
          throw new Error("Failed to update event");
        }

        // Refresh events
        await fetchAppEvents();
      }
    },
    [fetchAppEvents, refetchGoogleEvents, isEditingGoogleEvent],
  );

  // Create Google event
  const handleSaveGoogleEvent = useCallback(
    async (eventData: CreateEventData) => {
      const res = await fetch("/api/calendar/google-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error("Failed to create Google event");
      }

      // Refresh Google events
      await refetchGoogleEvents();
    },
    [refetchGoogleEvents],
  );

  // Delete Google event
  const handleDeleteGoogleEvent = useCallback(
    async (eventId: string) => {
      if (!confirm(t.googleEventDeleteConfirm)) return;

      try {
        const res = await fetch(`/api/calendar/google-events/${eventId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete Google event");
        }

        // Refresh Google events
        await refetchGoogleEvents();
      } catch (error) {
        console.error("Failed to delete Google event:", error);
      }
    },
    [t.googleEventDeleteConfirm, refetchGoogleEvents],
  );

  // Edit Google event
  const handleEditGoogleEvent = useCallback(
    (event: ExternalCalendarEvent) => {
      setIsEditingGoogleEvent(true);
      setEventToEdit({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.start,
        endTime: event.end,
        allDay: event.allDay,
        category: "personal", // Google events don't have categories
      });
      setEditDialogOpen(true);
    },
    [],
  );

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCalendarMonth({ year, month });
  }, []);

  const handleBackToMonth = useCallback(() => {
    setViewMode("month");
  }, []);

  const handleDayChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const convertedExternalEvents = useMemo(
    () => externalToCalendarEvents(externalEvents),
    [externalEvents],
  );

  const convertedAppEvents = useMemo(
    () => appToCalendarEvents(appEvents),
    [appEvents],
  );

  const displayEvents =
    calendarTab === "app" ? convertedAppEvents : convertedExternalEvents;

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
    <div className="space-y-2">
      {/* Welcome Banner (compact) */}
      <Card className="bg-primary border-0">
        <CardContent className="py-2">
          <div className="flex items-center justify-between text-primary-foreground">
            <p className="text-sm font-bold flex items-center gap-2">
              {t.welcomeBack}, {userName}!
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary-foreground/20 border border-primary-foreground/30">
                {userRole}
              </span>
            </p>
            <p className="hidden md:block text-sm opacity-80">
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
          onHasWritePermissionChange={handleGoogleWritePermissionChange}
        />
      </div>

      {/* Calendar + Right Panel */}
      <div
        className={cn(
          "grid gap-4",
          viewMode === "month"
            ? "grid-cols-1 lg:grid-cols-[1fr_320px]"
            : "grid-cols-1 lg:grid-cols-[1fr_360px]",
        )}
      >
        {/* Calendar / DayView */}
        <Card>
          <CardContent className="pt-6">
            {viewMode === "month" ? (
              <DashboardCalendar
                language={language}
                events={displayEvents}
                onDateSelect={setSelectedDate}
                selectedDate={selectedDate}
                onMonthChange={handleMonthChange}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            ) : (
              <DayView
                language={language}
                date={selectedDate || todayStr()}
                events={displayEvents}
                externalEvents={externalEvents}
                appEvents={appEvents}
                calendarTab={calendarTab}
                onBackToMonth={handleBackToMonth}
                onDateChange={handleDayChange}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onGoogleEventClick={handleEditGoogleEvent}
                googleHasWritePermission={googleHasWritePermission}
              />
            )}
          </CardContent>
        </Card>

        {/* Right Panel */}
        {viewMode === "month" ? (
          <Card className="flex flex-col">
            <CardContent className="pt-4 flex flex-col flex-1 min-h-0">
              {/* Tab switcher */}
              <div className="flex border-b mb-3">
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs font-medium py-2 border-b-2 transition-colors",
                    rightPanelTab === "events"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setRightPanelTab("events")}
                >
                  <RiCalendarEventLine className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  {t.tabEvents}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs font-medium py-2 border-b-2 transition-colors",
                    rightPanelTab === "concierge"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setRightPanelTab("concierge")}
                >
                  <RiSparklingLine className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  {t.tabConcierge}
                </button>
              </div>

              {rightPanelTab === "events" ? (
                <div className="flex-1 overflow-y-auto">
                  {selectedDate ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm">
                          {formatSelectedDate(selectedDate)}
                        </h3>
                        {(calendarTab === "app" ||
                          (calendarTab === "google" &&
                            googleHasWritePermission)) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDialogStartHour(9);
                              setCreateDialogEndHour(10);
                              setCreateDialogOpen(true);
                            }}
                            className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title={t.createEvent}
                          >
                            <RiAddLine className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {t.selectedDayEvents}
                      </p>
                      {calendarTab === "google" &&
                      selectedDayExternalDetails.length > 0 ? (
                        <div className="space-y-3">
                          {selectedDayExternalDetails.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
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
                              {googleHasWritePermission && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    onClick={() => handleEditGoogleEvent(event)}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                    title={t.googleEventEdit}
                                  >
                                    <RiEdit2Line className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteGoogleEvent(event.id)
                                    }
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    title={t.googleEventDelete}
                                  >
                                    <RiDeleteBinLine className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : calendarTab === "app" &&
                        selectedDayEvents.length > 0 ? (
                        <div className="space-y-3">
                          {selectedDayEvents.map((event) => {
                            // Get the original app event for time info
                            const appEvent = appEvents.find(
                              (e) => e.id === event.id,
                            );
                            const timeDisplay = appEvent
                              ? appEvent.allDay
                                ? t.calendarAllDay
                                : `${appEvent.startTime.split("T")[1]?.slice(0, 5)} - ${appEvent.endTime.split("T")[1]?.slice(0, 5)}`
                              : null;

                            return (
                              <div
                                key={event.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
                              >
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                    categoryConfig.find(
                                      (c) => c.key === event.category,
                                    )?.colorClass,
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-tight">
                                    {event.title}
                                  </p>
                                  {timeDisplay && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {timeDisplay}
                                    </p>
                                  )}
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
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (appEvent) handleEditEvent(appEvent);
                                    }}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                    title={t.eventEdit}
                                  >
                                    <RiEdit2Line className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    title={t.eventDelete}
                                  >
                                    <RiDeleteBinLine className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <CalendarConcierge
                    language={language}
                    events={convertedAppEvents}
                    appEvents={appEvents}
                    externalEvents={externalEvents}
                    selectedDate={selectedDate}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Day view: concierge always visible in right panel */
          <Card className="hidden lg:flex lg:flex-col">
            <CardContent className="pt-4 flex flex-col flex-1 min-h-0">
              <CalendarConcierge
                language={language}
                events={convertedAppEvents}
                appEvents={appEvents}
                externalEvents={externalEvents}
                selectedDate={selectedDate}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Legend (month view only) */}
      {viewMode === "month" && calendarTab === "app" && (
        <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
          {categoryConfig.map(({ key, colorClass }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
              <span>{t[categoryTranslationKeys[key] as keyof typeof t]}</span>
            </div>
          ))}
        </div>
      )}
      {viewMode === "month" && calendarTab === "google" && (
        <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Google Calendar</span>
          </div>
        </div>
      )}

      {/* Event Create Dialog */}
      <EventCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        date={selectedDate || todayStr()}
        startHour={createDialogStartHour}
        endHour={createDialogEndHour}
        language={language}
        onSave={
          calendarTab === "google" && googleHasWritePermission
            ? handleSaveGoogleEvent
            : handleSaveEvent
        }
        isGoogleEvent={calendarTab === "google" && googleHasWritePermission}
      />

      {/* Event Edit Dialog */}
      <EventEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setIsEditingGoogleEvent(false);
          }
        }}
        event={eventToEdit}
        language={language}
        onSave={handleSaveEditedEvent}
        isGoogleEvent={isEditingGoogleEvent}
      />
    </div>
  );
}
