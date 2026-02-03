import { prisma } from "@/lib/prisma";
import { googleCalendarProvider } from "./providers/google-calendar";
import type {
  CalendarProvider,
  CalendarProviderName,
  CreateExternalEventData,
  ExternalCalendarEvent,
  UpdateExternalEventData,
} from "./types";

const providers: Record<CalendarProviderName, CalendarProvider> = {
  google: googleCalendarProvider,
  // outlook: will be added in the future
  outlook: undefined as unknown as CalendarProvider,
};

function getProvider(name: CalendarProviderName): CalendarProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Calendar provider "${name}" is not available`);
  }
  return provider;
}

export const CalendarService = {
  getAuthUrl(provider: CalendarProviderName, userId: string): Promise<string> {
    return getProvider(provider).getAuthUrl(userId);
  },

  handleCallback(provider: CalendarProviderName, code: string, userId: string) {
    return getProvider(provider).handleCallback(code, userId);
  },

  async getConnections(userId: string) {
    return prisma.externalCalendarConnection.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        provider: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  async getEvents(
    userId: string,
    provider: CalendarProviderName,
    timeMin: string,
    timeMax: string,
  ): Promise<ExternalCalendarEvent[]> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      return [];
    }

    const p = getProvider(provider);

    // Refresh token if needed
    const refreshedConnection = await p.refreshTokenIfNeeded(connection);

    return p.getEvents(refreshedConnection, timeMin, timeMax);
  },

  async disconnect(userId: string, provider: CalendarProviderName) {
    return getProvider(provider).disconnect(userId);
  },

  async hasWritePermission(
    userId: string,
    provider: CalendarProviderName,
  ): Promise<boolean> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      return false;
    }

    const p = getProvider(provider);
    return p.hasWritePermission?.(connection) ?? false;
  },

  async createEvent(
    userId: string,
    provider: CalendarProviderName,
    data: CreateExternalEventData,
  ): Promise<ExternalCalendarEvent> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new Error("No active connection found");
    }

    const p = getProvider(provider);
    if (!p.createEvent) {
      throw new Error(`Provider "${provider}" does not support event creation`);
    }

    // Refresh token if needed
    const refreshedConnection = await p.refreshTokenIfNeeded(connection);

    return p.createEvent(refreshedConnection, data);
  },

  async updateEvent(
    userId: string,
    provider: CalendarProviderName,
    eventId: string,
    data: UpdateExternalEventData,
  ): Promise<ExternalCalendarEvent> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new Error("No active connection found");
    }

    const p = getProvider(provider);
    if (!p.updateEvent) {
      throw new Error(`Provider "${provider}" does not support event updates`);
    }

    // Refresh token if needed
    const refreshedConnection = await p.refreshTokenIfNeeded(connection);

    return p.updateEvent(refreshedConnection, eventId, data);
  },

  async deleteEvent(
    userId: string,
    provider: CalendarProviderName,
    eventId: string,
  ): Promise<void> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new Error("No active connection found");
    }

    const p = getProvider(provider);
    if (!p.deleteEvent) {
      throw new Error(`Provider "${provider}" does not support event deletion`);
    }

    // Refresh token if needed
    const refreshedConnection = await p.refreshTokenIfNeeded(connection);

    await p.deleteEvent(refreshedConnection, eventId);
  },
};
