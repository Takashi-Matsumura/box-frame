import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout-2fa
 * Clear the 2FA verification cookie on sign out
 */
export async function POST() {
  const cookieStore = await cookies();

  // Clear the 2FA verification cookie
  cookieStore.delete("2fa_verified");

  return NextResponse.json({ success: true });
}
