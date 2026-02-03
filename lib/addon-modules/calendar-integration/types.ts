import type { ExternalCalendarConnection } from "@prisma/client";

export type CalendarProviderName = "google" | "outlook";

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  allDay: boolean;
  location?: string;
  htmlLink?: string;
}

// Data for creating an external calendar event
export interface CreateExternalEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  allDay: boolean;
}

// Data for updating an external calendar event
export interface UpdateExternalEventData {
  title?: string;
  description?: string;
  location?: string;
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  allDay?: boolean;
}

// Write scope required for CRUD operations
export const GOOGLE_CALENDAR_WRITE_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_CALENDAR_READ_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export interface CalendarProvider {
  name: CalendarProviderName;
  getAuthUrl(userId: string, forceWriteScope?: boolean): Promise<string>;
  handleCallback(
    code: string,
    userId: string,
  ): Promise<ExternalCalendarConnection>;
  getEvents(
    connection: ExternalCalendarConnection,
    timeMin: string,
    timeMax: string,
  ): Promise<ExternalCalendarEvent[]>;
  refreshTokenIfNeeded(
    connection: ExternalCalendarConnection,
  ): Promise<ExternalCalendarConnection>;
  disconnect(userId: string): Promise<void>;

  // CRUD operations (optional, only for providers that support write access)
  createEvent?(
    connection: ExternalCalendarConnection,
    data: CreateExternalEventData,
  ): Promise<ExternalCalendarEvent>;
  updateEvent?(
    connection: ExternalCalendarConnection,
    eventId: string,
    data: UpdateExternalEventData,
  ): Promise<ExternalCalendarEvent>;
  deleteEvent?(
    connection: ExternalCalendarConnection,
    eventId: string,
  ): Promise<void>;

  // Check if connection has write permissions
  hasWritePermission?(connection: ExternalCalendarConnection): boolean;
}
