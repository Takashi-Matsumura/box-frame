import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateProcessScore,
  calculateGrowthScore,
  calculateFinalScore,
  getWeightsForPositionGrade,
} from "@/lib/addon-modules/evaluation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/evaluation/[id]
 * 評価詳細を取得
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        period: true,
        employee: {
          include: {
            department: true,
            section: true,
            course: true,
          },
        },
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

    // 重みを取得（役職×等級で検索）
    const weights = await getWeightsForPositionGrade(
      evaluation.periodId,
      evaluation.employee.positionCode,
      evaluation.gradeCode
    );

    // 結果評価データ（Criteria1）を取得（課→部→本部の優先順）
    let criteria1Result = null;
    if (evaluation.employee.courseId) {
      criteria1Result = await prisma.criteria1Result.findFirst({
        where: {
          periodId: evaluation.periodId,
          organizationLevel: "COURSE",
          organizationId: evaluation.employee.courseId,
          isActive: true,
        },
      });
    }
    if (!criteria1Result && evaluation.employee.sectionId) {
      criteria1Result = await prisma.criteria1Result.findFirst({
        where: {
          periodId: evaluation.periodId,
          organizationLevel: "SECTION",
          organizationId: evaluation.employee.sectionId,
          isActive: true,
        },
      });
    }
    if (!criteria1Result) {
      criteria1Result = await prisma.criteria1Result.findFirst({
        where: {
          periodId: evaluation.periodId,
          organizationLevel: "DEPARTMENT",
          organizationId: evaluation.employee.departmentId,
          isActive: true,
        },
      });
    }

    // フロントエンド用にフラット化したレスポンス
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
        id: evaluation.employee.id,
        employeeNumber: evaluation.employee.employeeId,
        lastName: evaluation.employee.name,
        firstName: "",
        lastNameEn: null,
        firstNameEn: null,
        position: evaluation.employee.position,
        qualificationGrade: evaluation.employee.qualificationGrade,
        department: evaluation.employee.department,
        section: evaluation.employee.section,
        course: evaluation.employee.course,
        birthDate: evaluation.employee.birthDate,
        joinDate: evaluation.employee.joinDate,
      },
      weights: {
        resultsWeight: weights.resultsWeight,
        processWeight: weights.processWeight,
        growthWeight: weights.growthWeight,
      },
      // フロントエンド互換性のためキー名はorganizationGoalを維持
      organizationGoal: criteria1Result
        ? {
            targetValue: criteria1Result.targetProfit || 0,
            actualValue: criteria1Result.actualProfit,
            achievementRate: criteria1Result.achievementRate,
          }
        : null,
      processCategories,
      growthCategories,
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/evaluation/[id]
 * 評価を更新
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      score1: inputScore1,
      score2: inputScore2,
      score3: inputScore3,
      processScores,
      growthCategoryId,
      growthLevel,
      finalScore: inputFinalScore,
      finalGrade: inputFinalGrade,
      evaluatorComment,
      status: inputStatus,
      score2Comment,
      score3Comment,
      score1Comment,
      overallComment,
    } = body;

    // 現在の評価を取得（重み検索用にemployeeも含む）
    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    // 重みを取得（役職×等級で検索）
    const weights = await getWeightsForPositionGrade(
      evaluation.periodId,
      evaluation.employee.positionCode,
      evaluation.gradeCode
    );

    // スコアを計算（入力値が直接指定されていればそれを使用）
    let score1 = inputScore1 ?? evaluation.score1;
    let score2 = inputScore2 ?? evaluation.score2;
    let score3 = inputScore3 ?? evaluation.score3;

    // プロセス評価スコアを計算（直接指定されていなければ）
    if (processScores && inputScore2 === undefined) {
      score2 = calculateProcessScore(processScores);
    }

    // 成長評価スコアを計算（直接指定されていなければ）
    if (growthCategoryId && growthLevel && inputScore3 === undefined) {
      score3 = await calculateGrowthScore(growthCategoryId, growthLevel);
    }

    // 最終スコアと評価（入力値が指定されていればそれを使用）
    let finalScore = inputFinalScore;
    let finalGrade = inputFinalGrade;

    if (finalScore === undefined || finalGrade === undefined) {
      const finalResult = calculateFinalScore(
        score1 || 0,
        score2 || 0,
        score3 || 0,
        weights
      );
      finalScore = finalResult.finalScore;
      finalGrade = finalResult.finalGrade;
    }

    // ステータスの決定
    let newStatus = inputStatus;
    if (!newStatus) {
      newStatus = evaluation.status === "PENDING" ? "IN_PROGRESS" : evaluation.status;
    }

    // 更新
    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        // スコア
        ...(score1 !== undefined && score1 !== null && { score1 }),
        ...(score2 !== undefined && score2 !== null && { score2 }),
        ...(score3 !== undefined && score3 !== null && { score3 }),
        // プロセス評価
        ...(processScores && { processScores }),
        ...(score2Comment !== undefined && { score2Comment }),
        // 成長評価
        ...(growthCategoryId && { growthCategoryId }),
        ...(growthLevel && { growthLevel }),
        ...(score3Comment !== undefined && { score3Comment }),
        // 結果評価コメント
        ...(score1Comment !== undefined && { score1Comment }),
        // 最終評価
        ...(evaluatorComment !== undefined && { overallComment: evaluatorComment }),
        ...(overallComment !== undefined && { overallComment }),
        // 計算結果
        ...(finalScore !== undefined && { finalScore }),
        ...(finalGrade !== undefined && { finalGrade }),
        // 重み付きスコア（簡易計算）
        weightedScore1: (score1 || 0) * (weights.resultsWeight / 100),
        weightedScore2: (score2 || 0) * (weights.processWeight / 100),
        weightedScore3: (score3 || 0) * (weights.growthWeight / 100),
        // ステータス
        status: newStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to update evaluation" },
      { status: 500 }
    );
  }
}
