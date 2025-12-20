import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateQrCodeDataUrl,
  generateTotpSecret,
  generateTotpUri,
} from "@/lib/totp";

/**
 * POST /api/user/two-factor/setup
 * Generate a new TOTP secret and QR code for 2FA setup
 */
export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { twoFactorEnabled: true },
  });

  if (user?.twoFactorEnabled) {
    return NextResponse.json(
      { error: "Two-factor authentication is already enabled" },
      { status: 400 },
    );
  }

  // Generate new secret
  const secret = generateTotpSecret();

  // Generate QR code
  const otpUri = generateTotpUri(session.user.email, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpUri);

  return NextResponse.json({
    secret,
    qrCodeDataUrl,
  });
}
