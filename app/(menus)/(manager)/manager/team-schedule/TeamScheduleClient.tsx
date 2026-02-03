"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiGroupLine,
  RiLoader4Line,
  RiRefreshLine,
} from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { teamScheduleTranslations } from "./translations";

interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  userId: string | null;
  departmentName: string | null;
  sectionName: string | null;
  courseName: string | null;
}

interface TeamEvent {
  id: string;
  userId: string;
  employeeId: string | null;
  employeeName: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: string;
  color: string | null;
}

interface ManagedUnits {
  departments: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  courses: { id: string; name: string }[];
}

interface TeamScheduleData {
  teamMembers: TeamMember[];
  events: TeamEvent[];
  managedUnits: ManagedUnits;
  currentEmployee: {
    id: string;
    name: string;
    departmentName: string | null;
    sectionName: string | null;
    courseName: string | null;
  } | null;
}

interface TeamScheduleClientProps {
  language: "en" | "ja";
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 - 18:00

const categoryColors: Record<string, string> = {
  personal: "bg-green-500",
  visitor: "bg-purple-500",
  meeting: "bg-blue-500",
  vacation: "bg-yellow-400",
  travel: "bg-pink-400",
};

// メンバーごとの色を生成
const memberColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
];

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const dayOfWeek = baseDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday start
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function TeamScheduleClient({
  language,
}: TeamScheduleClientProps) {
  const t = teamScheduleTranslations[language];

  const [data, setData] = useState<TeamScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  const weekDates = useMemo(
    () => getWeekDates(currentWeekStart),
    [currentWeekStart],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDate = formatDateStr(weekDates[0]);
      const endDate = formatDateStr(weekDates[6]);

      const res = await fetch(
        `/api/calendar/team-schedule?startDate=${startDate}&endDate=${endDate}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch team schedule");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching team schedule:", err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }, [weekDates, t.error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  }, []);

  const handleToday = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  }, []);

  // Filter events by selected member
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    if (selectedMemberId === "all") return data.events;
    const member = data.teamMembers.find((m) => m.id === selectedMemberId);
    if (!member?.userId) return [];
    return data.events.filter((e) => e.userId === member.userId);
  }, [data, selectedMemberId]);

  // Create member ID to color mapping
  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.teamMembers.forEach((member, index) => {
      if (member.userId) {
        map.set(member.userId, memberColors[index % memberColors.length]);
      }
    });
    return map;
  }, [data?.teamMembers]);

  // Get events for a specific day and hour
  const getEventsForSlot = useCallback(
    (date: Date, hour: number) => {
      return filteredEvents.filter((event) => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);

        if (event.allDay) {
          return isSameDay(start, date) || (start <= date && end >= date);
        }

        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        return start < slotEnd && end > slotStart && isSameDay(start, date);
      });
    },
    [filteredEvents],
  );

  // Get all-day events for a specific day
  const getAllDayEventsForDay = useCallback(
    (date: Date) => {
      return filteredEvents.filter((event) => {
        if (!event.allDay) return false;
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        return isSameDay(start, date) || (start <= date && end >= date);
      });
    },
    [filteredEvents],
  );

  const dayNames = [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];

  const today = new Date();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RiRefreshLine className="w-4 h-4" />
          {t.retry}
        </button>
      </div>
    );
  }

  if (!data || data.teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <RiGroupLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t.noTeamMembers}</h3>
            <p className="text-sm">{t.noTeamMembersDesc}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const membersWithCalendar = data.teamMembers.filter((m) => m.userId);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="p-2 rounded-md hover:bg-accent"
                  title={t.prevWeek}
                >
                  <RiArrowLeftSLine className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent"
                >
                  {t.todayButton}
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="p-2 rounded-md hover:bg-accent"
                  title={t.nextWeek}
                >
                  <RiArrowRightSLine className="w-5 h-5" />
                </button>
              </div>

              {/* Current Week Display */}
              <div className="text-sm font-medium">
                {t.monthNames[weekDates[0].getMonth()]}{" "}
                {weekDates[0].getDate()} -{" "}
                {weekDates[0].getMonth() !== weekDates[6].getMonth()
                  ? `${t.monthNames[weekDates[6].getMonth()]} `
                  : ""}
                {weekDates[6].getDate()}, {weekDates[0].getFullYear()}
              </div>
            </div>

            {/* Member Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t.selectMember}:
              </span>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allMembers}</SelectItem>
                  {membersWithCalendar.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            memberColorMap.get(member.userId || ""),
                          )}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                <div className="p-2 text-center text-xs text-muted-foreground border-r" />
                {weekDates.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  return (
                    <div
                      key={formatDateStr(date)}
                      className={cn(
                        "p-2 text-center border-r last:border-r-0",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        {dayNames[index]}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isToday &&
                            "w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto",
                        )}
                      >
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All-day Events Row */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
                <div className="p-1 text-center text-xs text-muted-foreground border-r flex items-center justify-center">
                  {t.allDay}
                </div>
                {weekDates.map((date) => {
                  const allDayEvents = getAllDayEventsForDay(date);
                  return (
                    <div
                      key={`allday-${formatDateStr(date)}`}
                      className="p-1 border-r last:border-r-0 min-h-[32px]"
                    >
                      {allDayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-1 py-0.5 rounded truncate text-white mb-0.5",
                            selectedMemberId === "all"
                              ? memberColorMap.get(event.userId) ||
                                  categoryColors[event.category] ||
                                  "bg-gray-500"
                              : categoryColors[event.category] || "bg-gray-500",
                          )}
                          title={`${event.employeeName}: ${event.title}`}
                        >
                          {selectedMemberId === "all" && event.employeeName
                            ? `${event.employeeName}: `
                            : ""}
                          {event.title}
                        </div>
                      ))}
                      {allDayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{allDayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <ScrollArea className="h-[500px]">
                <div>
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0"
                    >
                      <div className="p-1 text-center text-xs text-muted-foreground border-r flex items-start justify-center">
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      {weekDates.map((date) => {
                        const isToday = isSameDay(date, today);
                        const events = getEventsForSlot(date, hour);
                        return (
                          <div
                            key={`${formatDateStr(date)}-${hour}`}
                            className={cn(
                              "p-0.5 border-r last:border-r-0 min-h-[48px]",
                              isToday && "bg-primary/5",
                            )}
                          >
                            {events.slice(0, 3).map((event) => {
                              const start = new Date(event.startTime);
                              const startMinutes = start.getMinutes();
                              const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;

                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "text-xs px-1 py-0.5 rounded truncate text-white mb-0.5",
                                    selectedMemberId === "all"
                                      ? memberColorMap.get(event.userId) ||
                                          categoryColors[event.category] ||
                                          "bg-gray-500"
                                      : categoryColors[event.category] ||
                                          "bg-gray-500",
                                  )}
                                  title={`${event.employeeName}: ${event.title} (${timeStr})`}
                                >
                                  {selectedMemberId === "all" &&
                                  event.employeeName
                                    ? `${event.employeeName.slice(0, 3)}: `
                                    : ""}
                                  {event.title}
                                </div>
                              );
                            })}
                            {events.length > 3 && (
                              <div className="text-xs text-muted-foreground px-1">
                                +{events.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RiGroupLine className="w-4 h-4" />
            {t.teamMembers} ({membersWithCalendar.length}
            {t.memberCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {membersWithCalendar.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() =>
                  setSelectedMemberId(
                    selectedMemberId === member.id ? "all" : member.id,
                  )
                }
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                  selectedMemberId === member.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80",
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    memberColorMap.get(member.userId || ""),
                  )}
                />
                <span>{member.name}</span>
                <span className="text-xs opacity-70">
                  {member.departmentName}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
        {Object.entries(categoryColors).map(([key, colorClass]) => {
          const translationKey =
            `category${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof typeof t;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
              <span>{t[translationKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
