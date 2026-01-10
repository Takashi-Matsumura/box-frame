import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  generateEvaluationsForPeriod,
  initializeMasterData,
} from "@/lib/addon-modules/evaluation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/evaluation/periods/[id]/generate
 * 評価データを一括生成
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: periodId } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // マスタデータを初期化（存在しない場合のみ作成）
    await initializeMasterData();

    // URLパラメータから組織IDを取得（オプション）
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") || undefined;

    // 評価データを一括生成
    const result = await generateEvaluationsForPeriod(periodId, organizationId);

    return NextResponse.json({
      success: true,
      message: "Evaluations generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error generating evaluations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate evaluations",
      },
      { status: 500 },
    );
  }
}
