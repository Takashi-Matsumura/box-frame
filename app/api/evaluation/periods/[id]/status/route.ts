import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/evaluation/periods/[id]/status
 * 評価期間のステータスを変更
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ["DRAFT", "ACTIVE", "REVIEW", "CLOSED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // 現在のステータスを取得
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Period not found" },
        { status: 404 }
      );
    }

    // ステータス遷移のバリデーション
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["ACTIVE"],
      ACTIVE: ["REVIEW", "DRAFT"],
      REVIEW: ["CLOSED", "ACTIVE"],
      CLOSED: ["REVIEW"], // 再オープン可能
    };

    if (!validTransitions[period.status]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${period.status} to ${status}`,
        },
        { status: 400 }
      );
    }

    // ACTIVEに変更する場合、評価データが存在するか確認
    if (status === "ACTIVE") {
      const evaluationCount = await prisma.evaluation.count({
        where: { periodId: id },
      });

      if (evaluationCount === 0) {
        return NextResponse.json(
          { error: "No evaluations exist. Generate evaluations first." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.evaluationPeriod.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating evaluation period status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
