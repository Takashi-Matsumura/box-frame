import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/my-evaluation/history
 * 自分の過去の評価履歴を取得（COMPLETEDまたはCONFIRMEDステータスのもの）
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーのEmployeeを取得
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user?.email,
        isActive: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // 完了済みまたは確定済みの評価を取得
    const evaluations = await prisma.evaluation.findMany({
      where: {
        employeeId: employee.id,
        status: {
          in: ["COMPLETED", "CONFIRMED"],
        },
      },
      include: {
        period: true,
        evaluator: true,
      },
      orderBy: {
        period: {
          year: "desc",
        },
      },
    });

    // 履歴用にフォーマット
    const history = evaluations.map((evaluation) => ({
      id: evaluation.id,
      periodId: evaluation.periodId,
      periodName: evaluation.period.name,
      status: evaluation.status,
      score1: evaluation.score1,
      score2: evaluation.score2,
      score3: evaluation.score3,
      finalScore: evaluation.finalScore,
      finalGrade: evaluation.finalGrade,
      evaluatorComment: evaluation.overallComment,
      evaluator: evaluation.evaluator
        ? {
            lastName: evaluation.evaluator.name,
            firstName: "",
            lastNameEn: null,
            firstNameEn: null,
          }
        : null,
      completedAt: evaluation.updatedAt,
    }));

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching evaluation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation history" },
      { status: 500 }
    );
  }
}
