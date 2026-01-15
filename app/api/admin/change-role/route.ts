import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

export async function POST(request: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    // Validate role
    if (!["USER", "ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 },
      );
    }

    // Get current user to record old role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldRole = currentUser.role;

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "USER_ROLE_CHANGE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: userId,
      targetType: "User",
      details: {
        oldRole,
        newRole: role,
        targetUserName: currentUser.name,
        targetUserEmail: currentUser.email,
      },
    }).catch(() => {});

    // ロール変更通知を発行
    const roleLabels: Record<string, { en: string; ja: string }> = {
      USER: { en: "User", ja: "ユーザー" },
      MANAGER: { en: "Manager", ja: "管理職" },
      ADMIN: { en: "Administrator", ja: "管理者" },
    };
    const roleLabel = roleLabels[role] || { en: role, ja: role };

    await NotificationService.actionNotify(userId, {
      title: "Your role has been changed",
      titleJa: "ロールが変更されました",
      message: `Your role has been changed to ${roleLabel.en}.`,
      messageJa: `あなたのロールが「${roleLabel.ja}」に変更されました。`,
      actionUrl: "/dashboard",
      actionLabel: "View Dashboard",
      actionLabelJa: "ダッシュボードを見る",
      source: "ADMIN",
    }).catch((err) => {
      console.error("[Role] Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error changing user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
