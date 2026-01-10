import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/unread-count
 * 未読通知数を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", errorJa: "認証が必要です" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found", errorJa: "ユーザーが見つかりません" },
      { status: 404 },
    );
  }

  try {
    const [total, byType] = await Promise.all([
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      prisma.notification.groupBy({
        by: ["type"],
        where: { userId: user.id, isRead: false },
        _count: { id: true },
      }),
    ]);

    const byTypeMap = byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      count: total,
      byType: {
        SYSTEM: byTypeMap.SYSTEM || 0,
        SECURITY: byTypeMap.SECURITY || 0,
        ACTION: byTypeMap.ACTION || 0,
        INFO: byTypeMap.INFO || 0,
        WARNING: byTypeMap.WARNING || 0,
        ERROR: byTypeMap.ERROR || 0,
      },
    });
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return NextResponse.json(
      {
        error: "Failed to get unread count",
        errorJa: "未読数の取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
