import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // 変更履歴を記録
    await prisma.changeLog.create({
      data: {
        entityType: "User",
        entityId: id,
        changeType: "DELETE",
        fieldName: null,
        oldValue: JSON.stringify(userInfo),
        newValue: null,
        changeDescription: `ユーザアカウント削除: ${user.name || user.email} (${user.role})`,
        changeReason: "管理者による削除",
        changedBy: session.user.email || "unknown",
      },
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
