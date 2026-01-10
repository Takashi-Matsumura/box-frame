import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/evaluation/exclusions/[id]
 * 評価対象外設定を解除
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manager以上のロールが必要
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // 存在確認
    const existing = await prisma.evaluationExclusion.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Exclusion not found" },
        { status: 404 },
      );
    }

    // 削除
    await prisma.evaluationExclusion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting exclusion:", error);
    return NextResponse.json(
      { error: "Failed to delete exclusion" },
      { status: 500 },
    );
  }
}
