import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/disable
 * Disable 2FA after verifying the TOTP code
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
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
    select: { twoFactorEnabled: true, twoFactorSecret: true },
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

  // Disable 2FA
  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return NextResponse.json({ success: true });
}
