import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";

// POST /api/calendar/google-events - Googleカレンダーにイベント作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, location, startTime, endTime, allDay } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, endTime are required" },
        { status: 400 },
      );
    }

    // Check write permission
    const hasPermission = await CalendarService.hasWritePermission(
      session.user.id,
      "google",
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Write permission required. Please reconnect with extended permissions." },
        { status: 403 },
      );
    }

    const event = await CalendarService.createEvent(session.user.id, "google", {
      title,
      description: description || undefined,
      location: location || undefined,
      startTime,
      endTime,
      allDay: allDay || false,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[Calendar] Failed to create Google event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
