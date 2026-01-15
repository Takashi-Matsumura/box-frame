import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/[id]
 * 通知の詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found", errorJa: "通知が見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ notification });
}

/**
 * PATCH /api/notifications/[id]
 * 通知を更新（既読状態の変更）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // 所有者確認
  const existing = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Notification not found", errorJa: "通知が見つかりません" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const { isRead } = body;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead ?? existing.isRead,
        readAt: isRead ? new Date() : existing.readAt,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      {
        error: "Failed to update notification",
        errorJa: "通知の更新に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * 通知を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // 所有者確認
  const existing = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Notification not found", errorJa: "通知が見つかりません" },
      { status: 404 },
    );
  }

  try {
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json(
      {
        error: "Failed to delete notification",
        errorJa: "通知の削除に失敗しました",
      },
      { status: 500 },
    );
  }
}
