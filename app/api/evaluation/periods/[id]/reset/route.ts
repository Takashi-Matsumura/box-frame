import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resetEvaluationsForPeriod } from "@/lib/addon-modules/evaluation/services/batch-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/evaluation/periods/[id]/reset
 * 評価データをリセット（全削除）
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: periodId } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deletedCount = await resetEvaluationsForPeriod(periodId);

    return NextResponse.json({
      success: true,
      message: "Evaluations reset successfully",
      deletedCount,
    });
  } catch (error) {
    console.error("Error resetting evaluations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reset evaluations",
      },
      { status: 500 },
    );
  }
}
