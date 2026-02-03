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

export interface CreateEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  allDay: boolean;
  category: string;
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  startHour: number; // 9.5 = 9:30
  endHour: number; // 10.75 = 10:45
  language: "en" | "ja";
  onSave: (event: CreateEventData) => Promise<void>;
}

const CATEGORIES = [
  { value: "personal", colorClass: "bg-green-500" },
  { value: "evaluation", colorClass: "bg-yellow-400" },
  { value: "interview", colorClass: "bg-purple-500" },
  { value: "company", colorClass: "bg-blue-500" },
  { value: "birthday", colorClass: "bg-pink-400" },
];

function hourToTimeString(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function EventCreateDialog({
  open,
  onOpenChange,
  date,
  startHour,
  endHour,
  language,
  onSave,
}: EventCreateDialogProps) {
  const t = dashboardTranslations[language];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(hourToTimeString(startHour));
  const [endTime, setEndTime] = useState(hourToTimeString(endHour));
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens with new time selection
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime(hourToTimeString(startHour));
      setEndTime(hourToTimeString(endHour));
      setAllDay(false);
      setCategory("personal");
    }
  }, [open, startHour, endHour]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const startDateTime = allDay
        ? `${date}T00:00:00`
        : `${date}T${startTime}:00`;
      const endDateTime = allDay ? `${date}T23:59:59` : `${date}T${endTime}:00`;

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
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
    onSave,
    onOpenChange,
  ]);

  const categoryTranslationKeys: Record<string, string> = {
    evaluation: "categoryEvaluation",
    interview: "categoryInterview",
    company: "categoryCompany",
    personal: "categoryPersonal",
    birthday: "categoryBirthday",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.createEvent}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">{t.eventTitle}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitlePlaceholder}
              autoFocus
            />
          </div>

          {/* All day switch */}
          <div className="flex items-center gap-3">
            <Switch id="allDay" checked={allDay} onCheckedChange={setAllDay} />
            <Label htmlFor="allDay" className="cursor-pointer">
              {t.eventAllDay}
            </Label>
          </div>

          {/* Time selection (hidden when all-day) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">{t.eventStartTime}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">{t.eventEndTime}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Category */}
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

          {/* Location */}
          <div className="grid gap-2">
            <Label htmlFor="location">{t.eventLocation}</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.eventLocationPlaceholder}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">{t.eventDescription}</Label>
            <Textarea
              id="description"
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
            {isSaving ? t.eventCreating : t.eventSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
