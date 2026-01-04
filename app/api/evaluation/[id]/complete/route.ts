import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/evaluation/[id]/complete
 * 評価を確定
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    // 必須フィールドのチェック
    if (!evaluation.score2 || !evaluation.score3) {
      return NextResponse.json(
        { error: "All scores must be entered before completing" },
        { status: 400 }
      );
    }

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        evaluatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error completing evaluation:", error);
    return NextResponse.json(
      { error: "Failed to complete evaluation" },
      { status: 500 }
    );
  }
}
