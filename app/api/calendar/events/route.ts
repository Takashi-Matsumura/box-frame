import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";
import type { CalendarProviderName } from "@/lib/addon-modules/calendar-integration/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") as CalendarProviderName;
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!provider || !["google", "outlook"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid provider" },
      { status: 400 },
    );
  }

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax are required" },
      { status: 400 },
    );
  }

  try {
    const events = await CalendarService.getEvents(
      session.user.id,
      provider,
      timeMin,
      timeMax,
    );
    return NextResponse.json({ events });
  } catch (error) {
    console.error("[Calendar] Failed to get events:", error);
    return NextResponse.json(
      { error: "Failed to get events" },
      { status: 500 },
    );
  }
}
