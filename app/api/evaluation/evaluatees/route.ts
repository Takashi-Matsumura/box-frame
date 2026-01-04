import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEvaluatees } from "@/lib/addon-modules/evaluation";

/**
 * GET /api/evaluation/evaluatees
 * 被評価者一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      );
    }

    // 評価者のEmployeeを取得
    const evaluatorEmployee = await prisma.employee.findFirst({
      where: {
        email: session.user?.email,
        isActive: true,
      },
    });

    if (!evaluatorEmployee) {
      return NextResponse.json(
        { error: "Evaluator employee not found" },
        { status: 404 }
      );
    }

    // 被評価者IDリストを取得
    const evaluateeIds = await getEvaluatees(evaluatorEmployee.id, periodId);

    // 評価データを取得
    const evaluations = await prisma.evaluation.findMany({
      where: {
        periodId,
        employeeId: { in: evaluateeIds },
      },
      include: {
        employee: {
          include: {
            department: true,
            section: true,
            course: true,
          },
        },
      },
      orderBy: [
        { employee: { department: { name: "asc" } } },
        { employee: { section: { name: "asc" } } },
        { employee: { name: "asc" } },
      ],
    });

    // 進捗統計
    const stats = {
      total: evaluations.length,
      pending: evaluations.filter((e) => e.status === "PENDING").length,
      inProgress: evaluations.filter((e) => e.status === "IN_PROGRESS").length,
      completed: evaluations.filter((e) => e.status === "COMPLETED").length,
      confirmed: evaluations.filter((e) => e.status === "CONFIRMED").length,
    };

    return NextResponse.json({
      evaluations,
      stats,
    });
  } catch (error) {
    console.error("Error fetching evaluatees:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluatees" },
      { status: 500 }
    );
  }
}
