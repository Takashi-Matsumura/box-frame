import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/two-factor/status
 * Get the current 2FA status for the logged-in user
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { twoFactorEnabled: true },
  });

  return NextResponse.json({
    enabled: user?.twoFactorEnabled ?? false,
  });
}
