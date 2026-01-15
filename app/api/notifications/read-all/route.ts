import type { NotificationType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/notifications/read-all
 * 通知を一括既読にする
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}));
    const { ids, type } = body as {
      ids?: string[];
      type?: NotificationType;
    };

    const where = {
      userId: user.id,
      isRead: false,
      ...(ids && ids.length > 0 && { id: { in: ids } }),
      ...(type && { type }),
    };

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json(
      {
        error: "Failed to mark notifications as read",
        errorJa: "通知の既読化に失敗しました",
      },
      { status: 500 },
    );
  }
}
