import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/verify
 * Verify TOTP code during login (called from login flow)
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { email, code } = body;

  if (!email || !code) {
    return NextResponse.json(
      { error: "Email and code are required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled for this user" },
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

  return NextResponse.json({ success: true });
}
