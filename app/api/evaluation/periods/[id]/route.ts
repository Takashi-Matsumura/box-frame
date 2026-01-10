import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/evaluation/periods/[id]
 * 評価期間詳細を取得
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = await prisma.evaluationPeriod.findUnique({
      where: { id },
      include: {
        weights: {
          orderBy: { gradeCode: "asc" },
        },
        criteria1Results: true,
        _count: {
          select: { evaluations: true },
        },
      },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Evaluation period not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error("Error fetching evaluation period:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation period" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/evaluation/periods/[id]
 * 評価期間を更新
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
    const { name, startDate, endDate } = body;

    const period = await prisma.evaluationPeriod.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error("Error updating evaluation period:", error);
    return NextResponse.json(
      { error: "Failed to update evaluation period" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/evaluation/periods/[id]
 * 評価期間を削除
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 評価データが存在する場合は削除不可
    const evaluationCount = await prisma.evaluation.count({
      where: { periodId: id },
    });

    if (evaluationCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete period with existing evaluations" },
        { status: 400 },
      );
    }

    await prisma.evaluationPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting evaluation period:", error);
    return NextResponse.json(
      { error: "Failed to delete evaluation period" },
      { status: 500 },
    );
  }
}
