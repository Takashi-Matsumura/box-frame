"use client";

import { Check, MessageSquare, Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InterviewDate {
  id: string;
  date: string;
  note?: string;
}

interface EvaluationCalendarProps {
  language: "en" | "ja";
  periodStartDate: string;
  periodEndDate: string;
  interviewDates: InterviewDate[];
  onInterviewDatesChange: (dates: InterviewDate[]) => void;
  selfEvaluationSubmittedAt: Date | null;
  selfEvaluationStatus: "DRAFT" | "SUBMITTED";
  canSubmitSelfEvaluation: boolean;
  onSubmitSelfEvaluation: () => void;
  canEdit: boolean;
}

const translations = {
  en: {
    calendar: "Calendar",
    calendarDescription: "Mark interview dates and track your progress",
    interviewDate: "Interview",
    selfEvaluationCompleted: "Self Evaluation Completed",
    addInterview: "Add Interview",
    interviewNote: "Note (optional)",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    submitSelfEvaluation: "Submit Self Evaluation",
    draft: "Draft",
    submitted: "Submitted",
  },
  ja: {
    calendar: "カレンダー",
    calendarDescription: "面談日をマークして進捗を管理",
    interviewDate: "面談",
    selfEvaluationCompleted: "自己評価完了",
    addInterview: "面談を追加",
    interviewNote: "メモ（任意）",
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    sun: "日",
    mon: "月",
    tue: "火",
    wed: "水",
    thu: "木",
    fri: "金",
    sat: "土",
    submitSelfEvaluation: "自己評価を提出",
    draft: "下書き",
    submitted: "提出済み",
  },
};

const monthNames = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  ja: [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ],
};

export function EvaluationCalendar({
  language,
  periodStartDate,
  periodEndDate,
  interviewDates,
  onInterviewDatesChange,
  selfEvaluationSubmittedAt,
  selfEvaluationStatus,
  canSubmitSelfEvaluation,
  onSubmitSelfEvaluation,
  canEdit,
}: EvaluationCalendarProps) {
  const t = translations[language];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewDate | null>(null);
  const [interviewNote, setInterviewNote] = useState("");

  // Get months to display based on period
  const months = useMemo(() => {
    const start = new Date(periodStartDate);
    const end = new Date(periodEndDate);
    const result: { year: number; month: number }[] = [];

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      result.push({ year: current.getFullYear(), month: current.getMonth() });
      current.setMonth(current.getMonth() + 1);
    }

    return result;
  }, [periodStartDate, periodEndDate]);

  // Get days for a month
  const getDaysInMonth = useCallback((year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, []);

  // Check if a date has an interview
  const getInterviewForDate = useCallback((dateStr: string) => {
    return interviewDates.find((d) => d.date === dateStr);
  }, [interviewDates]);

  // Check if self evaluation was completed on this date
  const isSelfEvaluationDate = useCallback((dateStr: string) => {
    if (!selfEvaluationSubmittedAt) return false;
    const submittedDate = new Date(selfEvaluationSubmittedAt).toISOString().split("T")[0];
    return submittedDate === dateStr;
  }, [selfEvaluationSubmittedAt]);

  // Format date string
  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Handle date click
  const handleDateClick = (year: number, month: number, day: number) => {
    if (!canEdit) return;

    const dateStr = formatDateStr(year, month, day);
    const existingInterview = getInterviewForDate(dateStr);

    if (existingInterview) {
      setEditingInterview(existingInterview);
      setInterviewNote(existingInterview.note || "");
    } else {
      setEditingInterview(null);
      setInterviewNote("");
    }

    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  // Save interview
  const handleSaveInterview = () => {
    if (!selectedDate) return;

    if (editingInterview) {
      // Update existing
      onInterviewDatesChange(
        interviewDates.map((d) =>
          d.id === editingInterview.id ? { ...d, note: interviewNote } : d
        )
      );
    } else {
      // Add new
      const newInterview: InterviewDate = {
        id: `interview-${Date.now()}`,
        date: selectedDate,
        note: interviewNote,
      };
      onInterviewDatesChange([...interviewDates, newInterview]);
    }

    setDialogOpen(false);
    setSelectedDate(null);
    setEditingInterview(null);
    setInterviewNote("");
  };

  // Delete interview
  const handleDeleteInterview = () => {
    if (!editingInterview) return;

    onInterviewDatesChange(interviewDates.filter((d) => d.id !== editingInterview.id));
    setDialogOpen(false);
    setSelectedDate(null);
    setEditingInterview(null);
    setInterviewNote("");
  };

  // Check if date is within period
  const isDateInPeriod = (dateStr: string) => {
    return dateStr >= periodStartDate && dateStr <= periodEndDate;
  };

  const weekDays = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {t.calendar}
            </CardTitle>
            <Badge
              variant={selfEvaluationStatus === "SUBMITTED" ? "default" : "secondary"}
              className={selfEvaluationStatus === "SUBMITTED" ? "bg-green-600" : ""}
            >
              {selfEvaluationStatus === "SUBMITTED" ? t.submitted : t.draft}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.calendarDescription}
          </p>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
              <span>{t.interviewDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span>{t.selfEvaluationCompleted}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map(({ year, month }) => (
              <div key={`${year}-${month}`} className="border rounded-lg p-3">
                {/* Month header */}
                <div className="text-center font-medium mb-2">
                  {year}年 {monthNames[language][month]}
                </div>

                {/* Week days header */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        "text-center text-xs font-medium py-1",
                        i === 0 && "text-red-500",
                        i === 6 && "text-blue-500"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(year, month).map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="h-8" />;
                    }

                    const dateStr = formatDateStr(year, month, day);
                    const isInPeriod = isDateInPeriod(dateStr);
                    const interview = getInterviewForDate(dateStr);
                    const isSelfEvalDay = isSelfEvaluationDate(dateStr);
                    const dayOfWeek = new Date(year, month, day).getDay();
                    const isToday = dateStr === new Date().toISOString().split("T")[0];

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => isInPeriod && handleDateClick(year, month, day)}
                        disabled={!isInPeriod || !canEdit}
                        className={cn(
                          "h-8 w-full rounded text-sm relative transition-colors",
                          isInPeriod
                            ? "hover:bg-accent cursor-pointer"
                            : "text-muted-foreground/30 cursor-default",
                          dayOfWeek === 0 && isInPeriod && "text-red-500",
                          dayOfWeek === 6 && isInPeriod && "text-blue-500",
                          isToday && "ring-2 ring-primary ring-offset-1",
                          (interview || isSelfEvalDay) && "font-bold"
                        )}
                      >
                        {day}
                        {/* Stamps */}
                        {(interview || isSelfEvalDay) && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {interview && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                            {isSelfEvalDay && (
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Interview list */}
          {interviewDates.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {interviewDates
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((interview) => (
                    <Badge
                      key={interview.id}
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => {
                        if (!canEdit) return;
                        setSelectedDate(interview.date);
                        setEditingInterview(interview);
                        setInterviewNote(interview.note || "");
                        setDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="w-3 h-3 text-blue-500" />
                      <span>{interview.date}</span>
                      {interview.note && (
                        <span className="text-muted-foreground">: {interview.note}</span>
                      )}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Self Evaluation Submit */}
          {selfEvaluationStatus !== "SUBMITTED" && canEdit && (
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={onSubmitSelfEvaluation}
                disabled={!canSubmitSelfEvaluation}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {t.submitSelfEvaluation}
              </Button>
            </div>
          )}

          {/* Submitted confirmation */}
          {selfEvaluationStatus === "SUBMITTED" && (
            <div className="mt-4 pt-4 border-t flex items-center justify-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-medium">{t.selfEvaluationCompleted}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInterview ? t.interviewDate : t.addInterview}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">{selectedDate}</div>
              <Input
                value={interviewNote}
                onChange={(e) => setInterviewNote(e.target.value)}
                placeholder={t.interviewNote}
              />
            </div>
            <div className="flex justify-between gap-2">
              {editingInterview && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteInterview}
                >
                  {t.delete}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button size="sm" onClick={handleSaveInterview}>
                  {t.save}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
