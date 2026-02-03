import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";
import type { CalendarProviderName } from "@/lib/addon-modules/calendar-integration/types";
import { GOOGLE_CALENDAR_WRITE_SCOPE } from "@/lib/addon-modules/calendar-integration/types";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get connections with scope info for permission checking
    const rawConnections = await prisma.externalCalendarConnection.findMany({
      where: { userId: session.user.id, isActive: true },
      select: {
        id: true,
        provider: true,
        email: true,
        isActive: true,
        createdAt: true,
        scope: true,
      },
    });

    // Add hasWritePermission flag to each connection
    const connections = rawConnections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      email: conn.email,
      isActive: conn.isActive,
      createdAt: conn.createdAt,
      hasWritePermission: (conn.scope || "").includes(GOOGLE_CALENDAR_WRITE_SCOPE),
    }));

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("[Calendar] Failed to get connections:", error);
    return NextResponse.json(
      { error: "Failed to get connections" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider } = (await request.json()) as {
      provider: CalendarProviderName;
    };

    if (!provider || !["google", "outlook"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 },
      );
    }

    await CalendarService.disconnect(session.user.id, provider);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Calendar] Failed to disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
