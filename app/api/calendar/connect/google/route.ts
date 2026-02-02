import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = await CalendarService.getAuthUrl("google", session.user.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Calendar] Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 },
    );
  }
}
