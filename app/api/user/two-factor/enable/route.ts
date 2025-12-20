import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/enable
 * Enable 2FA after verifying the TOTP code
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { secret, code } = body;

  if (!secret || !code) {
    return NextResponse.json(
      { error: "Secret and code are required" },
      { status: 400 },
    );
  }

  // Verify the TOTP code
  const isValid = verifyTotp(code, secret);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid verification code" },
      { status: 400 },
    );
  }

  // Enable 2FA and save the secret
  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    },
  });

  return NextResponse.json({ success: true });
}
