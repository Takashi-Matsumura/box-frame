import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertWeight } from "@/lib/addon-modules/evaluation";

/**
 * GET /api/evaluation/weights
 * 重み設定一覧を取得
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

    const weights = await prisma.evaluationWeight.findMany({
      where: { periodId },
      orderBy: { gradeCode: "asc" },
    });

    return NextResponse.json(weights);
  } catch (error) {
    console.error("Error fetching weights:", error);
    return NextResponse.json(
      { error: "Failed to fetch weights" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluation/weights
 * 重み設定を作成・更新
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { periodId, gradeCode, resultsWeight, processWeight, growthWeight } = body;

    if (!periodId || !gradeCode) {
      return NextResponse.json(
        { error: "periodId and gradeCode are required" },
        { status: 400 }
      );
    }

    // 合計が100%になることを確認
    const total = resultsWeight + processWeight + growthWeight;
    if (total !== 100) {
      return NextResponse.json(
        { error: `Weight total must be 100%, got ${total}%` },
        { status: 400 }
      );
    }

    await upsertWeight(periodId, gradeCode, {
      resultsWeight,
      processWeight,
      growthWeight,
    });

    const weight = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_gradeCode: { periodId, gradeCode },
      },
    });

    return NextResponse.json(weight);
  } catch (error) {
    console.error("Error updating weight:", error);
    return NextResponse.json(
      { error: "Failed to update weight" },
      { status: 500 }
    );
  }
}
