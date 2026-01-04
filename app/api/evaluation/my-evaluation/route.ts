import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeightsForGrade } from "@/lib/addon-modules/evaluation";

/**
 * GET /api/evaluation/my-evaluation
 * 自分の評価を取得（periodIdクエリパラメータで特定の期間を指定可能）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");

    // ユーザーのEmployeeを取得
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user?.email,
        isActive: true,
      },
      include: {
        department: true,
        section: true,
        course: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // 特定の期間の評価を取得
    if (periodId) {
      const evaluation = await prisma.evaluation.findFirst({
        where: {
          employeeId: employee.id,
          periodId,
        },
        include: {
          period: true,
          evaluator: true,
        },
      });

      if (!evaluation) {
        return NextResponse.json(
          { error: "Evaluation not found" },
          { status: 404 }
        );
      }

      // プロセス評価項目を取得
      const processCategories = await prisma.processCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      // 成長カテゴリを取得
      const growthCategories = await prisma.growthCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      // 重みを取得
      const weights = await getWeightsForGrade(
        evaluation.periodId,
        evaluation.gradeCode
      );

      // 組織目標（結果評価用）を取得
      let organizationGoal = null;
      if (employee.courseId) {
        organizationGoal = await prisma.organizationGoal.findFirst({
          where: {
            periodId: evaluation.periodId,
            organizationType: "COURSE",
            organizationId: employee.courseId,
          },
        });
      }
      if (!organizationGoal && employee.sectionId) {
        organizationGoal = await prisma.organizationGoal.findFirst({
          where: {
            periodId: evaluation.periodId,
            organizationType: "SECTION",
            organizationId: employee.sectionId,
          },
        });
      }
      if (!organizationGoal && employee.departmentId) {
        organizationGoal = await prisma.organizationGoal.findFirst({
          where: {
            periodId: evaluation.periodId,
            organizationType: "DEPARTMENT",
            organizationId: employee.departmentId,
          },
        });
      }

      // フラット化したレスポンス
      return NextResponse.json({
        id: evaluation.id,
        status: evaluation.status,
        score1: evaluation.score1,
        score2: evaluation.score2,
        score3: evaluation.score3,
        processScores: evaluation.processScores,
        growthCategoryId: evaluation.growthCategoryId,
        growthLevel: evaluation.growthLevel,
        finalScore: evaluation.finalScore,
        finalGrade: evaluation.finalGrade,
        evaluatorComment: evaluation.overallComment,
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeId,
          lastName: employee.name,
          firstName: "",
          lastNameEn: null,
          firstNameEn: null,
          position: employee.position,
          qualificationGrade: employee.qualificationGrade,
          department: employee.department,
          section: employee.section,
          course: employee.course,
        },
        evaluator: evaluation.evaluator
          ? {
              lastName: evaluation.evaluator.name,
              firstName: "",
              lastNameEn: null,
              firstNameEn: null,
            }
          : null,
        weights: {
          resultsWeight: weights.resultsWeight,
          processWeight: weights.processWeight,
          growthWeight: weights.growthWeight,
        },
        organizationGoal: organizationGoal
          ? {
              targetValue: organizationGoal.targetProfit || 0,
              actualValue: organizationGoal.actualProfit,
              achievementRate: organizationGoal.achievementRate,
            }
          : null,
        processCategories,
        growthCategories,
      });
    }

    // periodIdがない場合は一覧を返す（従来の動作）
    const evaluations = await prisma.evaluation.findMany({
      where: {
        employeeId: employee.id,
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

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("Error fetching my evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}
