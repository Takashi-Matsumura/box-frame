import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";
import { googleCalendarProvider } from "@/lib/addon-modules/calendar-integration/providers/google-calendar";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if upgrading permissions is requested
    const body = await request.json().catch(() => ({}));
    const upgradePermissions = body.upgradePermissions === true;

    // Use the provider directly to pass the forceWriteScope parameter
    const url = await googleCalendarProvider.getAuthUrl(
      session.user.id,
      upgradePermissions,
    );
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Calendar] Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 },
    );
  }
}
