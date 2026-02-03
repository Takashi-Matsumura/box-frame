import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";

// PUT /api/calendar/google-events/[id] - Googleカレンダーのイベント更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { title, description, location, startTime, endTime, allDay } = body;

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

    const event = await CalendarService.updateEvent(
      session.user.id,
      "google",
      eventId,
      {
        title,
        description,
        location,
        startTime,
        endTime,
        allDay,
      },
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("[Calendar] Failed to update Google event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  }
}

// DELETE /api/calendar/google-events/[id] - Googleカレンダーのイベント削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: eventId } = await params;

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

    await CalendarService.deleteEvent(session.user.id, "google", eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Calendar] Failed to delete Google event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
