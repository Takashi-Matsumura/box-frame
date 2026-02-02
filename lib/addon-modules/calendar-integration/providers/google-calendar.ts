import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type {
  CalendarProvider,
  ExternalCalendarEvent,
} from "../types";
import type { ExternalCalendarConnection } from "@prisma/client";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.AUTH_URL || process.env.NEXTAUTH_URL}/api/calendar/callback/google`,
  );
}

export const googleCalendarProvider: CalendarProvider = {
  name: "google",

  async getAuthUrl(userId: string): Promise<string> {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
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
};
