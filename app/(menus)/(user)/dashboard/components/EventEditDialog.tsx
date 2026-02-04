"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { dashboardTranslations } from "../translations";

export interface EditEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  allDay: boolean;
  category: string;
}

export interface EventToEdit {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: string;
}

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventToEdit | null;
  language: "en" | "ja";
  onSave: (eventId: string, event: EditEventData) => Promise<void>;
  isGoogleEvent?: boolean;
}

const CATEGORIES = [
  { value: "personal", colorClass: "bg-green-500" },
  { value: "visitor", colorClass: "bg-purple-500" },
  { value: "meeting", colorClass: "bg-blue-500" },
  { value: "vacation", colorClass: "bg-yellow-400" },
  { value: "travel", colorClass: "bg-pink-400" },
];

export function EventEditDialog({
  open,
  onOpenChange,
  event,
  language,
  onSave,
  isGoogleEvent = false,
}: EventEditDialogProps) {
  const t = dashboardTranslations[language];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when dialog opens with event data
  useEffect(() => {
    if (open && event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
      // Extract date and time from ISO string using Date object for proper timezone handling
      const startDateObj = new Date(event.startTime);
      const endDateObj = new Date(event.endTime);
      // Get local date in YYYY-MM-DD format
      const year = startDateObj.getFullYear();
      const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
      const day = String(startDateObj.getDate()).padStart(2, "0");
      const startDate = `${year}-${month}-${day}`;
      // Get local time in HH:MM format
      const startTimeStr = `${String(startDateObj.getHours()).padStart(2, "0")}:${String(startDateObj.getMinutes()).padStart(2, "0")}`;
      const endTimeStr = `${String(endDateObj.getHours()).padStart(2, "0")}:${String(endDateObj.getMinutes()).padStart(2, "0")}`;
      setDate(startDate);
      setStartTime(startTimeStr);
      setEndTime(endTimeStr);
      setAllDay(event.allDay);
      setCategory(event.category || "personal");
    }
  }, [open, event]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !event) return;

    setIsSaving(true);
    try {
      // Create Date objects from local date and time, then convert to ISO string
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const [year, month, day] = date.split("-").map(Number);

      const startDateObj = allDay
        ? new Date(year, month - 1, day, 0, 0, 0)
        : new Date(year, month - 1, day, startHour, startMin, 0);
      const endDateObj = allDay
        ? new Date(year, month - 1, day, 23, 59, 59)
        : new Date(year, month - 1, day, endHour, endMin, 0);

      await onSave(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startDateObj.toISOString(),
        endTime: endDateObj.toISOString(),
        allDay,
        category,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    description,
    location,
    date,
    startTime,
    endTime,
    allDay,
    category,
    event,
    onSave,
    onOpenChange,
  ]);

  const categoryTranslationKeys: Record<string, string> = {
    personal: "categoryPersonal",
    visitor: "categoryVisitor",
    meeting: "categoryMeeting",
    vacation: "categoryVacation",
    travel: "categoryTravel",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.eventEdit}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="edit-title">{t.eventTitle}</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitlePlaceholder}
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="edit-date">{t.eventDate || "Date"}</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* All day switch */}
          <div className="flex items-center gap-3">
            <Switch
              id="edit-allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label htmlFor="edit-allDay" className="cursor-pointer">
              {t.eventAllDay}
            </Label>
          </div>

          {/* Time selection (hidden when all-day) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-startTime">{t.eventStartTime}</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endTime">{t.eventEndTime}</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Category (not shown for Google events) */}
          {!isGoogleEvent && (
            <div className="grid gap-2">
              <Label>{t.eventCategory}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${cat.colorClass}`}
                        />
                        <span>
                          {
                            t[
                              categoryTranslationKeys[cat.value] as keyof typeof t
                            ]
                          }
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location */}
          <div className="grid gap-2">
            <Label htmlFor="edit-location">{t.eventLocation}</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.eventLocationPlaceholder}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="edit-description">{t.eventDescription}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.eventDescriptionPlaceholder}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t.eventCancel}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving ? t.eventSaving : t.eventSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
