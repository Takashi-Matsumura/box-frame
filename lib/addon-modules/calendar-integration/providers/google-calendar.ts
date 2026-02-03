import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type {
  CalendarProvider,
  CreateExternalEventData,
  ExternalCalendarEvent,
  UpdateExternalEventData,
} from "../types";
import {
  GOOGLE_CALENDAR_READ_SCOPE,
  GOOGLE_CALENDAR_WRITE_SCOPE,
} from "../types";
import type { ExternalCalendarConnection } from "@prisma/client";

// Default to write scope + read scope for new connections
// calendar.events allows CRUD on events, calendar.readonly allows listing calendars
const SCOPES = [GOOGLE_CALENDAR_WRITE_SCOPE, GOOGLE_CALENDAR_READ_SCOPE];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.AUTH_URL || process.env.NEXTAUTH_URL}/api/calendar/callback/google`,
  );
}

export const googleCalendarProvider: CalendarProvider = {
  name: "google",

  async getAuthUrl(
    userId: string,
    forceWriteScope?: boolean,
  ): Promise<string> {
    const oauth2Client = getOAuth2Client();
    // Always use both scopes (write + read) for full functionality
    // forceWriteScope parameter is kept for API compatibility but not used differently
    const scopes = [GOOGLE_CALENDAR_WRITE_SCOPE, GOOGLE_CALENDAR_READ_SCOPE];
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: userId,
    });
    return url;
  },

  async handleCallback(
    code: string,
    userId: string,
  ): Promise<ExternalCalendarConnection> {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Get the user's email from the calendar API
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(
      (cal) => cal.primary,
    );
    const calendarEmail = primaryCalendar?.id || null;

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    const connection = await prisma.externalCalendarConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: "google",
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt,
        scope: tokens.scope || SCOPES.join(" "),
        isActive: true,
        email: calendarEmail,
      },
      create: {
        userId,
        provider: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope || SCOPES.join(" "),
        isActive: true,
        email: calendarEmail,
      },
    });

    return connection;
  },

  async getEvents(
    connection: ExternalCalendarConnection,
    timeMin: string,
    timeMax: string,
  ): Promise<ExternalCalendarEvent[]> {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events: ExternalCalendarEvent[] = (response.data.items || []).map(
      (item) => {
        const isAllDay = !!item.start?.date;
        return {
          id: item.id || "",
          title: item.summary || "(No title)",
          description: item.description || undefined,
          start: item.start?.dateTime || item.start?.date || "",
          end: item.end?.dateTime || item.end?.date || "",
          allDay: isAllDay,
          location: item.location || undefined,
          htmlLink: item.htmlLink || undefined,
        };
      },
    );

    return events;
  },

  async refreshTokenIfNeeded(
    connection: ExternalCalendarConnection,
  ): Promise<ExternalCalendarConnection> {
    // Check if token expires within 5 minutes
    const now = new Date();
    const buffer = 5 * 60 * 1000;
    if (connection.expiresAt.getTime() - now.getTime() > buffer) {
      return connection;
    }

    if (!connection.refreshToken) {
      throw new Error("No refresh token available. Please reconnect.");
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    const updated = await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || connection.refreshToken,
        expiresAt,
      },
    });

    return updated;
  },

  async disconnect(userId: string): Promise<void> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "google",
        },
      },
    });

    if (connection) {
      // Revoke the token
      try {
        const oauth2Client = getOAuth2Client();
        await oauth2Client.revokeToken(connection.accessToken);
      } catch {
        // Token revocation failure is non-critical
      }

      await prisma.externalCalendarConnection.delete({
        where: { id: connection.id },
      });
    }
  },

  hasWritePermission(connection: ExternalCalendarConnection): boolean {
    // Check if the connection's scope includes write permission
    const scope = connection.scope || "";
    return scope.includes(GOOGLE_CALENDAR_WRITE_SCOPE);
  },

  async createEvent(
    connection: ExternalCalendarConnection,
    data: CreateExternalEventData,
  ): Promise<ExternalCalendarEvent> {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const requestBody = data.allDay
      ? {
          summary: data.title,
          description: data.description,
          location: data.location,
          start: { date: data.startTime.split("T")[0] },
          end: {
            // Google all-day events use exclusive end date
            date: (() => {
              const d = new Date(data.endTime.split("T")[0]);
              d.setDate(d.getDate() + 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })(),
          },
        }
      : {
          summary: data.title,
          description: data.description,
          location: data.location,
          start: { dateTime: data.startTime, timeZone: "Asia/Tokyo" },
          end: { dateTime: data.endTime, timeZone: "Asia/Tokyo" },
        };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody,
    });

    const item = response.data;
    const isAllDay = !!item.start?.date;

    return {
      id: item.id || "",
      title: item.summary || "(No title)",
      description: item.description || undefined,
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      allDay: isAllDay,
      location: item.location || undefined,
      htmlLink: item.htmlLink || undefined,
    };
  },

  async updateEvent(
    connection: ExternalCalendarConnection,
    eventId: string,
    data: UpdateExternalEventData,
  ): Promise<ExternalCalendarEvent> {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Build the patch request body
    const patchBody: {
      summary?: string;
      description?: string;
      location?: string;
      start?: { date?: string; dateTime?: string; timeZone?: string };
      end?: { date?: string; dateTime?: string; timeZone?: string };
    } = {};

    if (data.title !== undefined) {
      patchBody.summary = data.title;
    }
    if (data.description !== undefined) {
      patchBody.description = data.description;
    }
    if (data.location !== undefined) {
      patchBody.location = data.location;
    }

    // Handle time updates
    if (data.allDay !== undefined || data.startTime || data.endTime) {
      // If changing to/from all-day, we need to handle the format
      if (data.allDay) {
        if (data.startTime) {
          patchBody.start = { date: data.startTime.split("T")[0] };
        }
        if (data.endTime) {
          // Google all-day events use exclusive end date
          const d = new Date(data.endTime.split("T")[0]);
          d.setDate(d.getDate() + 1);
          patchBody.end = {
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          };
        }
      } else {
        if (data.startTime) {
          patchBody.start = { dateTime: data.startTime, timeZone: "Asia/Tokyo" };
        }
        if (data.endTime) {
          patchBody.end = { dateTime: data.endTime, timeZone: "Asia/Tokyo" };
        }
      }
    }

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: patchBody,
    });

    const item = response.data;
    const isAllDay = !!item.start?.date;

    return {
      id: item.id || "",
      title: item.summary || "(No title)",
      description: item.description || undefined,
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      allDay: isAllDay,
      location: item.location || undefined,
      htmlLink: item.htmlLink || undefined,
    };
  },

  async deleteEvent(
    connection: ExternalCalendarConnection,
    eventId: string,
  ): Promise<void> {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  },
};
