import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/custom-evaluators
 * カスタム評価者一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    const where: Record<string, unknown> = {};
    if (periodId) {
      where.OR = [{ periodId }, { periodId: null }];
    }

    const customEvaluators = await prisma.customEvaluator.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            position: true,
            department: { select: { name: true } },
            section: { select: { name: true } },
            course: { select: { name: true } },
          },
        },
        evaluator: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            position: true,
          },
        },
        period: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customEvaluators);
  } catch (error) {
    console.error("Error fetching custom evaluators:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom evaluators" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluation/custom-evaluators
 * カスタム評価者を設定
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { employeeId, evaluatorId, periodId, effectiveFrom, effectiveTo } =
      body;

    if (!employeeId || !evaluatorId) {
      return NextResponse.json(
        { error: "employeeId and evaluatorId are required" },
        { status: 400 },
      );
    }

    // 自分自身を評価者に設定できない
    if (employeeId === evaluatorId) {
      return NextResponse.json(
        { error: "Cannot set self as evaluator" },
        { status: 400 },
      );
    }

    // 既存の設定をチェック
    const existing = await prisma.customEvaluator.findFirst({
      where: {
        employeeId,
        periodId: periodId || null,
      },
    });

    if (existing) {
      // 更新
      const updated = await prisma.customEvaluator.update({
        where: { id: existing.id },
        data: {
          evaluatorId,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        },
        include: {
          employee: { select: { name: true } },
          evaluator: { select: { name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // 新規作成
    const created = await prisma.customEvaluator.create({
      data: {
        employeeId,
        evaluatorId,
        periodId: periodId || null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: {
        employee: { select: { name: true } },
        evaluator: { select: { name: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating custom evaluator:", error);
    return NextResponse.json(
      { error: "Failed to create custom evaluator" },
      { status: 500 },
    );
  }
}
