import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CalendarService } from "@/lib/addon-modules/calendar-integration/calendar-service";

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }
  return process.env.AUTH_URL || request.url;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const baseUrl = getBaseUrl(request);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[Calendar] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=denied", baseUrl),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=no_code", baseUrl),
    );
  }

  // Validate state matches user ID
  if (state !== session.user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=invalid_state", baseUrl),
    );
  }

  try {
    await CalendarService.handleCallback("google", code, session.user.id);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_connected=google", baseUrl),
    );
  } catch (err) {
    console.error("[Calendar] Callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=callback_failed", baseUrl),
    );
  }
}
