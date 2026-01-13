import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * POST /api/evaluation/my-evaluation/goals/submit
 * 自己評価を提出する（DRAFT → SUBMITTED）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      periodId,
      selfProcessScores,
      selfGrowthCategoryId,
      selfGrowthLevel,
    } = body as {
      periodId: string;
      selfProcessScores: Record<string, number>;
      selfGrowthCategoryId: string;
      selfGrowthLevel: number;
    };

    if (!periodId || !selfProcessScores || !selfGrowthCategoryId || selfGrowthLevel === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 評価期間の確認
    const period = await prisma.evaluationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Evaluation period not found" },
        { status: 404 }
      );
    }

    // ACTIVE期間中のみ提出可能
    if (period.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Self evaluation can only be submitted during ACTIVE period" },
        { status: 400 }
      );
    }

    // 既存のPersonalGoalを確認
    const existingGoal = await prisma.personalGoal.findUnique({
      where: {
        periodId_userId: {
          periodId,
          userId: session.user.id,
        },
      },
    });

    if (existingGoal?.selfEvaluationStatus === "SUBMITTED") {
      return NextResponse.json(
        { error: "Self evaluation has already been submitted" },
        { status: 400 }
      );
    }

    // 自己評価を提出（更新）
    const selfProcessScoresJson = selfProcessScores as unknown as Prisma.InputJsonValue;

    const personalGoal = await prisma.personalGoal.upsert({
      where: {
        periodId_userId: {
          periodId,
          userId: session.user.id,
        },
      },
      update: {
        selfProcessScores: selfProcessScoresJson,
        selfGrowthCategoryId,
        selfGrowthLevel,
        selfEvaluationStatus: "SUBMITTED",
        selfEvaluationSubmittedAt: new Date(),
      },
      create: {
        periodId,
        userId: session.user.id,
        processGoals: Prisma.JsonNull,
        growthGoal: Prisma.JsonNull,
        selfProcessScores: selfProcessScoresJson,
        selfGrowthCategoryId,
        selfGrowthLevel,
        selfEvaluationStatus: "SUBMITTED",
        selfEvaluationSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: personalGoal.id,
      selfEvaluationStatus: "SUBMITTED",
      selfEvaluationSubmittedAt: personalGoal.selfEvaluationSubmittedAt,
    });
  } catch (error) {
    console.error("Error submitting self evaluation:", error);
    return NextResponse.json(
      { error: "Failed to submit self evaluation" },
      { status: 500 }
    );
  }
}
