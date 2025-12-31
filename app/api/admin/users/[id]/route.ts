import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";
import { AuditService } from "@/lib/services/audit-service";

/**
 * DELETE /api/admin/users/[id]
 *
 * ユーザを削除
 *
 * 制約:
 * - 自分自身は削除できない
 * - ADMIN権限が必要
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 自分自身を削除しようとしていないか確認
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    // ユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 削除前にユーザ情報を記録
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    // ユーザを削除
    await prisma.user.delete({
      where: { id },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "USER_DELETE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: id,
      targetType: "User",
      details: { deletedUser: userInfo },
    }).catch(() => {});

    // 全管理者にユーザー削除通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SECURITY",
      priority: "HIGH",
      title: "User account deleted",
      titleJa: "ユーザーアカウントが削除されました",
      message: `User "${user.name || user.email}" (${user.role}) has been deleted by ${session.user.email}.`,
      messageJa: `ユーザー「${user.name || user.email}」（${user.role}）が ${session.user.email} によって削除されました。`,
      source: "ADMIN",
      metadata: userInfo,
    }).catch((err) => {
      console.error("[User Delete] Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
