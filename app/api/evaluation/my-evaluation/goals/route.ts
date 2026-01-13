import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * プロセス目標の型定義
 */
interface ProcessGoal {
  id: string;
  name: string;
  goalText: string;
  isDefault: boolean;
  order: number;
}

/**
 * 成長目標の型定義
 */
interface GrowthGoal {
  categoryId: string;
  categoryName: string;
  goalText: string;
}

/**
 * 面談日の型定義
 */
interface InterviewDate {
  id: string;
  date: string;
  note?: string;
}

/**
 * GET /api/evaluation/my-evaluation/goals
 * 自分の目標設定を取得（ユーザーベース）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");

    // periodIdがない場合は現在有効な評価期間を取得
    let targetPeriodId = periodId;
    if (!targetPeriodId) {
      const now = new Date();
      const activePeriod = await prisma.evaluationPeriod.findFirst({
        where: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { startDate: "desc" },
      });

      if (!activePeriod) {
        // ACTIVEな期間がない場合は最新の期間を取得
        const latestPeriod = await prisma.evaluationPeriod.findFirst({
          where: {
            status: { in: ["ACTIVE", "REVIEW", "CLOSED"] },
          },
          orderBy: { startDate: "desc" },
        });

        if (!latestPeriod) {
          return NextResponse.json(
            { error: "No evaluation period available" },
            { status: 404 },
          );
        }
        targetPeriodId = latestPeriod.id;
      } else {
        targetPeriodId = activePeriod.id;
      }
    }

    // 期間情報を取得
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: targetPeriodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Evaluation period not found" },
        { status: 404 },
      );
    }

    // 個人目標データを取得
    const personalGoal = await prisma.personalGoal.findUnique({
      where: {
        periodId_userId: {
          periodId: targetPeriodId,
          userId,
        },
      },
    });

    // プロセスカテゴリ一覧を取得（評価マスタから）
    const processCategories = await prisma.processCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // 成長カテゴリ一覧を取得（評価マスタから）
    const growthCategories = await prisma.growthCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // 評価者情報を取得（ユーザーに紐づく評価がある場合）
    let evaluator: { name: string } | null = null;
    if (userEmail) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (employee) {
        const evaluation = await prisma.evaluation.findFirst({
          where: {
            employeeId: employee.id,
            periodId: targetPeriodId,
          },
          include: {
            evaluator: {
              select: { name: true },
            },
          },
        });

        if (evaluation?.evaluator) {
          evaluator = { name: evaluation.evaluator.name };
        }
      }
    }

    // 自己評価の編集可能判定
    // ACTIVE期間中かつ未提出の場合のみ編集可能
    const canEditSelfEvaluation =
      period.status === "ACTIVE" &&
      (!personalGoal ||
        personalGoal.selfEvaluationStatus !== "SUBMITTED");

    // 目標データがない場合はデフォルト値を返す
    if (!personalGoal) {
      const defaultProcessGoals: ProcessGoal[] = [
        {
          id: "default-1",
          name: "通常業務",
          goalText: "",
          isDefault: true,
          order: 1,
        },
      ];

      return NextResponse.json({
        periodId: targetPeriodId,
        userId,
        processGoals: defaultProcessGoals,
        growthGoal: null,
        selfReflection: null,
        interviewDates: [],
        evaluator,
        period,
        processCategories,
        growthCategories,
        // 自己評価データ
        selfEvaluation: null,
        canEditSelfEvaluation,
      });
    }

    // 自己評価データの構築
    const selfEvaluation = {
      processScores: (personalGoal.selfProcessScores as Record<string, number>) || {},
      processComments: (personalGoal.selfProcessComments as Record<string, string>) || {},
      growthCategoryId: personalGoal.selfGrowthCategoryId,
      growthLevel: personalGoal.selfGrowthLevel,
      growthComment: personalGoal.selfGrowthComment || "",
      status: (personalGoal.selfEvaluationStatus as "DRAFT" | "SUBMITTED") || "DRAFT",
      submittedAt: personalGoal.selfEvaluationSubmittedAt,
    };

    return NextResponse.json({
      id: personalGoal.id,
      periodId: personalGoal.periodId,
      userId: personalGoal.userId,
      processGoals: personalGoal.processGoals as unknown as ProcessGoal[],
      growthGoal: personalGoal.growthGoal as unknown as GrowthGoal | null,
      selfReflection: personalGoal.selfReflection,
      interviewDates: personalGoal.interviewDates as unknown as InterviewDate[],
      evaluator,
      period,
      processCategories,
      growthCategories,
      // 自己評価データ
      selfEvaluation,
      canEditSelfEvaluation,
    });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluation/my-evaluation/goals
 * 目標設定を保存（upsert）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const body = await request.json();
    const {
      periodId,
      processGoals,
      growthGoal,
      selfReflection,
      interviewDates,
      // 自己評価データ
      selfProcessScores,
      selfProcessComments,
      selfGrowthCategoryId,
      selfGrowthLevel,
      selfGrowthComment,
    } = body as {
      periodId: string;
      processGoals: ProcessGoal[];
      growthGoal: GrowthGoal | null;
      selfReflection?: string;
      interviewDates?: InterviewDate[];
      // 自己評価データ
      selfProcessScores?: Record<string, number>;
      selfProcessComments?: Record<string, string>;
      selfGrowthCategoryId?: string;
      selfGrowthLevel?: number;
      selfGrowthComment?: string;
    };

    if (!periodId || !processGoals) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 評価期間の存在確認
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Evaluation period not found" },
        { status: 404 },
      );
    }

    // ユーザーに紐付くEmployeeを検索（オプション）
    let employeeId: string | null = null;
    if (userEmail) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });
      if (employee) {
        employeeId = employee.id;
      }
    }

    // 個人目標データを保存（upsert）
    const processGoalsJson = processGoals as unknown as Prisma.InputJsonValue;
    const interviewDatesJson = (interviewDates ||
      []) as unknown as Prisma.InputJsonValue;

    // 自己評価データの準備（undefinedの場合は更新しない）
    const selfProcessScoresJson = selfProcessScores !== undefined
      ? (selfProcessScores as unknown as Prisma.InputJsonValue)
      : undefined;
    const selfProcessCommentsJson = selfProcessComments !== undefined
      ? (selfProcessComments as unknown as Prisma.InputJsonValue)
      : undefined;

    const personalGoal = await prisma.personalGoal.upsert({
      where: {
        periodId_userId: {
          periodId,
          userId,
        },
      },
      update: {
        processGoals: processGoalsJson,
        growthGoal: growthGoal
          ? (growthGoal as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        selfReflection: selfReflection || null,
        interviewDates: interviewDatesJson,
        employeeId, // Employeeが見つかれば紐付け
        // 自己評価データ（undefinedでない場合のみ更新）
        ...(selfProcessScoresJson !== undefined && {
          selfProcessScores: selfProcessScoresJson,
        }),
        ...(selfProcessCommentsJson !== undefined && {
          selfProcessComments: selfProcessCommentsJson,
        }),
        ...(selfGrowthCategoryId !== undefined && {
          selfGrowthCategoryId: selfGrowthCategoryId || null,
        }),
        ...(selfGrowthLevel !== undefined && {
          selfGrowthLevel: selfGrowthLevel || null,
        }),
        ...(selfGrowthComment !== undefined && {
          selfGrowthComment: selfGrowthComment || null,
        }),
      },
      create: {
        periodId,
        userId,
        employeeId, // Employeeが見つかれば紐付け
        processGoals: processGoalsJson,
        growthGoal: growthGoal
          ? (growthGoal as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        selfReflection: selfReflection || null,
        interviewDates: interviewDatesJson,
        // 自己評価データ
        selfProcessScores: selfProcessScoresJson ?? Prisma.JsonNull,
        selfProcessComments: selfProcessCommentsJson ?? Prisma.JsonNull,
        selfGrowthCategoryId: selfGrowthCategoryId || null,
        selfGrowthLevel: selfGrowthLevel || null,
        selfGrowthComment: selfGrowthComment || null,
      },
    });

    return NextResponse.json({
      id: personalGoal.id,
      periodId: personalGoal.periodId,
      userId: personalGoal.userId,
      employeeId: personalGoal.employeeId,
      processGoals: personalGoal.processGoals,
      growthGoal: personalGoal.growthGoal,
      selfReflection: personalGoal.selfReflection,
      interviewDates: personalGoal.interviewDates,
      period,
    });
  } catch (error) {
    console.error("Error saving goals:", error);
    return NextResponse.json(
      { error: "Failed to save goals" },
      { status: 500 },
    );
  }
}
