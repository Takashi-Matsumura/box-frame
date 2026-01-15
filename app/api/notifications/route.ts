import type { NotificationPriority, NotificationType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * GET /api/notifications
 * 通知一覧を取得（ページネーション対応）
 */
export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(
    parseInt(searchParams.get("pageSize") || "20"),
    100,
  );
  const type = searchParams.get("type") as NotificationType | null;
  const isReadParam = searchParams.get("isRead");
  const isRead =
    isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;

  const where = {
    userId: user.id,
    ...(type && { type }),
    ...(isRead !== undefined && { isRead }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
    pageSize,
    unreadCount,
  });
}

/**
 * POST /api/notifications
 * 通知を作成（管理者またはシステム用）
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", errorJa: "認証が必要です" },
      { status: 401 },
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required", errorJa: "管理者権限が必要です" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const {
      userId,
      userIds,
      role,
      broadcast,
      type,
      priority,
      title,
      titleJa,
      message,
      messageJa,
      actionUrl,
      actionLabel,
      actionLabelJa,
      source,
      sourceId,
      metadata,
      expiresAt,
    } = body;

    if (!title || !message || !type) {
      return NextResponse.json(
        {
          error: "title, message, and type are required",
          errorJa: "title、message、typeは必須です",
        },
        { status: 400 },
      );
    }

    // ブロードキャスト通知
    if (broadcast || userIds || role) {
      const result = await NotificationService.broadcast({
        userIds,
        role,
        broadcast,
        type: type as NotificationType,
        priority: priority as NotificationPriority | undefined,
        title,
        titleJa,
        message,
        messageJa,
        actionUrl,
        actionLabel,
        actionLabelJa,
        source,
        sourceId,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return NextResponse.json({
        success: true,
        count: result.count,
      });
    }

    // 単一ユーザへの通知
    const targetUserId = userId || currentUser.id;
    const notification = await NotificationService.create({
      userId: targetUserId,
      type: type as NotificationType,
      priority: priority as NotificationPriority | undefined,
      title,
      titleJa,
      message,
      messageJa,
      actionUrl,
      actionLabel,
      actionLabelJa,
      source,
      sourceId,
      metadata,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json(
      {
        error: "Failed to create notification",
        errorJa: "通知の作成に失敗しました",
      },
      { status: 500 },
    );
  }
}
