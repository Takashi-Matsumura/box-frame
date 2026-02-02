import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[Calendar] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=denied", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=no_code", request.url),
    );
  }

  // Validate state matches user ID
  if (state !== session.user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=invalid_state", request.url),
    );
  }

  try {
    await CalendarService.handleCallback("google", code, session.user.id);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_connected=google", request.url),
    );
  } catch (err) {
    console.error("[Calendar] Callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=callback_failed", request.url),
    );
  }
}
