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

export interface CalendarProvider {
  name: CalendarProviderName;
  getAuthUrl(userId: string): Promise<string>;
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
}
