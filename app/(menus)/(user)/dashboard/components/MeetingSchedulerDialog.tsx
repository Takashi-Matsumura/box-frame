"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiCalendarScheduleLine,
  RiCloseLine,
  RiLoaderLine,
  RiSearchLine,
  RiSparklingLine,
  RiUserAddLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { dashboardTranslations } from "../translations";

interface Participant {
  name: string;
  employeeName: string | null;
  employeeId: string | null;
  email: string | null;
  userId: string | null;
  found: boolean;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  departmentName: string | null;
  userId: string | null;
}

interface AvailableSlot {
  start: string;
  end: string;
}

interface MeetingSchedulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "en" | "ja";
  selectedDate: string | null;
  onCreateEvent: (eventData: {
    title: string;
    startTime: string;
    endTime: string;
    category: string;
  }) => Promise<void>;
}

function formatDate(isoString: string, language: "en" | "ja"): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(isoString: string, language: "en" | "ja"): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingSchedulerDialog({
  open,
  onOpenChange,
  language,
  selectedDate,
  onCreateEvent,
}: MeetingSchedulerDialogProps) {
  const t = dashboardTranslations[language];

  // State for participant input
  const [inputMode, setInputMode] = useState<"text" | "select">("text");
  const [textInput, setTextInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedParticipants, setParsedParticipants] = useState<Participant[]>(
    [],
  );

  // State for employee selection
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // State for date range and duration
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("60");

  // State for availability
  const [isSearchingAvailability, setIsSearchingAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // State for event creation
  const [meetingTitle, setMeetingTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Initialize dates when dialog opens
  useEffect(() => {
    if (open) {
      const today = selectedDate || new Date().toISOString().split("T")[0];
      setStartDate(today);
      // Default to 5 days from start
      const end = new Date(today);
      end.setDate(end.getDate() + 4);
      setEndDate(end.toISOString().split("T")[0]);
      // Reset state
      setTextInput("");
      setParsedParticipants([]);
      setSelectedEmployees([]);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setMeetingTitle("");
    }
  }, [open, selectedDate]);

  // Load employees for selection mode
  const loadEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await fetch("/api/organization/employees?limit=200");
      if (res.ok) {
        const data = await res.json();
        // Map employees with userId from their email
        const employeesWithData = (data.employees || []).map(
          (emp: {
            id: string;
            employeeId: string;
            name: string;
            email: string | null;
            department?: { name: string };
          }) => ({
            id: emp.id,
            employeeId: emp.employeeId,
            name: emp.name,
            email: emp.email,
            departmentName: emp.department?.name || null,
            userId: null, // Will be fetched when searching availability
          }),
        );
        setEmployees(employeesWithData);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    if (open && inputMode === "select" && employees.length === 0) {
      loadEmployees();
    }
  }, [open, inputMode, employees.length, loadEmployees]);

  // Parse participants from text using AI
  const handleParseText = useCallback(async () => {
    if (!textInput.trim()) return;

    setIsParsing(true);
    try {
      const res = await fetch(
        "/api/calendar/meeting-scheduler/parse-participants",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setParsedParticipants(data.participants || []);
      }
    } catch (error) {
      console.error("Failed to parse participants:", error);
    } finally {
      setIsParsing(false);
    }
  }, [textInput]);

  // Remove parsed participant
  const handleRemoveParsedParticipant = useCallback((name: string) => {
    setParsedParticipants((prev) => prev.filter((p) => p.name !== name));
  }, []);

  // Toggle employee selection
  const handleToggleEmployee = useCallback((employee: Employee) => {
    setSelectedEmployees((prev) => {
      const isSelected = prev.some((e) => e.id === employee.id);
      if (isSelected) {
        return prev.filter((e) => e.id !== employee.id);
      }
      return [...prev, employee];
    });
  }, []);

  // Get userIds for availability search
  const getParticipantUserIds = useCallback(async (): Promise<string[]> => {
    const emails: string[] = [];

    // From parsed participants
    for (const p of parsedParticipants) {
      if (p.found && p.email) {
        emails.push(p.email);
      }
    }

    // From selected employees
    for (const emp of selectedEmployees) {
      if (emp.email && !emails.includes(emp.email)) {
        emails.push(emp.email);
      }
    }

    if (emails.length === 0) return [];

    // Fetch userIds from emails
    try {
      const res = await fetch("/api/users/by-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      if (res.ok) {
        const data = await res.json();
        return (data.users || []).map(
          (u: { id: string; email: string }) => u.id,
        );
      }
    } catch (error) {
      console.error("Failed to fetch user IDs:", error);
    }

    return [];
  }, [parsedParticipants, selectedEmployees]);

  // Search availability
  const handleSearchAvailability = useCallback(async () => {
    const userIds = await getParticipantUserIds();

    if (userIds.length === 0) {
      return;
    }

    setIsSearchingAvailability(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const res = await fetch("/api/calendar/meeting-scheduler/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantUserIds: userIds,
          dateRange: { start: startDate, end: endDate },
          duration: Number.parseInt(duration, 10),
          workingHours: { start: 9, end: 18 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error("Failed to search availability:", error);
    } finally {
      setIsSearchingAvailability(false);
    }
  }, [getParticipantUserIds, startDate, endDate, duration]);

  // Create meeting event
  const handleCreateMeeting = useCallback(async () => {
    if (!selectedSlot || !meetingTitle.trim()) return;

    setIsCreating(true);
    try {
      await onCreateEvent({
        title: meetingTitle.trim(),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        category: "meeting",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create meeting:", error);
    } finally {
      setIsCreating(false);
    }
  }, [selectedSlot, meetingTitle, onCreateEvent, onOpenChange]);

  // Filter employees by search
  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch) return true;
    const search = employeeSearch.toLowerCase();
    return (
      emp.name.toLowerCase().includes(search) ||
      emp.employeeId.toLowerCase().includes(search) ||
      emp.departmentName?.toLowerCase().includes(search)
    );
  });

  const hasParticipants =
    parsedParticipants.filter((p) => p.found).length > 0 ||
    selectedEmployees.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiCalendarScheduleLine className="w-5 h-5" />
            {t.meetingScheduler}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Input Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("text")}
              className="flex-1"
            >
              <RiSparklingLine className="w-4 h-4 mr-1" />
              {t.meetingInputAI}
            </Button>
            <Button
              variant={inputMode === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("select")}
              className="flex-1"
            >
              <RiUserAddLine className="w-4 h-4 mr-1" />
              {t.meetingInputSelect}
            </Button>
          </div>

          {/* Text Input Mode */}
          {inputMode === "text" && (
            <div className="space-y-2">
              <Label>{t.meetingParticipantsLabel}</Label>
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t.meetingParticipantsPlaceholder}
                  className="flex-1"
                />
                <Button
                  onClick={handleParseText}
                  disabled={!textInput.trim() || isParsing}
                  size="sm"
                >
                  {isParsing ? (
                    <RiLoaderLine className="w-4 h-4 animate-spin" />
                  ) : (
                    <RiSearchLine className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Parsed Participants */}
              {parsedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedParticipants.map((p) => (
                    <div
                      key={p.name}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                        p.found
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                      )}
                    >
                      <span>{p.found ? p.employeeName : p.name}</span>
                      {!p.found && (
                        <span className="text-xs opacity-70">
                          ({t.meetingNotFound})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveParsedParticipant(p.name)}
                        className="ml-1 hover:opacity-70"
                      >
                        <RiCloseLine className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Employee Selection Mode */}
          {inputMode === "select" && (
            <div className="space-y-2">
              <Label>{t.meetingSelectEmployees}</Label>

              {/* Selected Employees */}
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      <span>{emp.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleEmployee(emp)}
                        className="ml-1 hover:opacity-70"
                      >
                        <RiCloseLine className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <Input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder={t.meetingSearchEmployees}
                className="mb-2"
              />

              {/* Employee List */}
              <ScrollArea className="h-[150px] border rounded-md">
                {isLoadingEmployees ? (
                  <div className="flex items-center justify-center h-full">
                    <RiLoaderLine className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredEmployees.slice(0, 50).map((emp) => {
                      const isSelected = selectedEmployees.some(
                        (e) => e.id === emp.id,
                      );
                      return (
                        <div
                          key={emp.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent",
                            isSelected && "bg-accent",
                          )}
                          onClick={() => handleToggleEmployee(emp)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleToggleEmployee(emp);
                            }
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {emp.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {emp.departmentName || emp.employeeId}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Date Range and Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t.meetingStartDate}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.meetingEndDate}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.meetingDuration}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30{t.meetingMinutes}</SelectItem>
                  <SelectItem value="60">60{t.meetingMinutes}</SelectItem>
                  <SelectItem value="90">90{t.meetingMinutes}</SelectItem>
                  <SelectItem value="120">120{t.meetingMinutes}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Availability Button */}
          <Button
            onClick={handleSearchAvailability}
            disabled={!hasParticipants || isSearchingAvailability}
            className="w-full"
          >
            {isSearchingAvailability ? (
              <>
                <RiLoaderLine className="w-4 h-4 mr-2 animate-spin" />
                {t.meetingSearching}
              </>
            ) : (
              <>
                <RiSearchLine className="w-4 h-4 mr-2" />
                {t.meetingSearchAvailability}
              </>
            )}
          </Button>

          {/* Available Slots */}
          {availableSlots.length > 0 && (
            <div className="space-y-2">
              <Label>{t.meetingAvailableSlots}</Label>
              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-2 space-y-1">
                  {availableSlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.start === slot.start &&
                      selectedSlot?.end === slot.end;
                    return (
                      <div
                        key={`${slot.start}-${slot.end}`}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent",
                          isSelected && "bg-primary/10 border border-primary",
                        )}
                        onClick={() => setSelectedSlot(slot)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedSlot(slot);
                          }
                        }}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {formatDate(slot.start, language)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(slot.start, language)} -{" "}
                            {formatTime(slot.end, language)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {availableSlots.length === 0 &&
            !isSearchingAvailability &&
            hasParticipants && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.meetingNoSlots}
              </p>
            )}

          {/* Meeting Title */}
          {selectedSlot && (
            <div className="space-y-2">
              <Label>{t.meetingTitle}</Label>
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder={t.meetingTitlePlaceholder}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.eventCancel}
          </Button>
          <Button
            onClick={handleCreateMeeting}
            disabled={!selectedSlot || !meetingTitle.trim() || isCreating}
          >
            {isCreating ? t.eventCreating : t.meetingCreate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
