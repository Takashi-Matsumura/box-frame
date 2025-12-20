import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/auth/verify-totp
 * Verify TOTP code after login and set verification cookie
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json(
      { error: "Verification code is required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled" },
      { status: 400 },
    );
  }

  // Verify the TOTP code
  const isValid = verifyTotp(code, user.twoFactorSecret);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid verification code" },
      { status: 400 },
    );
  }

  // Set verification cookie (expires with session)
  const cookieStore = await cookies();
  cookieStore.set("2fa_verified", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Cookie expires in 24 hours or when browser closes
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ success: true });
}
