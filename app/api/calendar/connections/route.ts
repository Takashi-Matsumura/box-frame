import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";
import type { CalendarProviderName } from "@/lib/addon-modules/calendar-integration/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await CalendarService.getConnections(session.user.id);
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
