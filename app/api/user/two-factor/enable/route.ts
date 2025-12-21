import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { NotificationService } from "@/lib/services/notification-service";

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
  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    },
  });

  // 2FA有効化通知を発行
  await NotificationService.securityNotify(user.id, {
    title: "Two-factor authentication enabled",
    titleJa: "2段階認証が有効になりました",
    message:
      "Two-factor authentication has been enabled for your account. You will need to enter a verification code when logging in.",
    messageJa:
      "アカウントの2段階認証が有効になりました。ログイン時に確認コードの入力が必要になります。",
  }).catch((err) => {
    console.error("[2FA] Failed to create notification:", err);
  });

  return NextResponse.json({ success: true });
}
