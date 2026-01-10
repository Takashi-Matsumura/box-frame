import type { ChangeType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { HistoryRecorder } from "@/lib/history";

/**
 * GET /api/admin/organization/history
 *
 * 変更履歴を取得
 *
 * Query Parameters:
 * - entityType: エンティティタイプ（Employee, Department, Section, Course, Organization）
 * - entityId: エンティティID
 * - changeType: 変更タイプ
 * - startDate: 開始日時
 * - endDate: 終了日時
 * - batchId: バッチID
 * - limit: 取得件数（デフォルト: 50）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const changeType = searchParams.get("changeType") as ChangeType | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const batchId = searchParams.get("batchId");
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

    // バリデーション
    if (limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 },
      );
    }

    let logs;

    if (batchId) {
      // バッチIDで検索
      logs = await HistoryRecorder.getChangeLogsByBatchId(batchId);
    } else if (entityType && entityId) {
      // エンティティ指定で検索
      logs = await HistoryRecorder.getEntityHistory(
        entityType as
          | "Employee"
          | "Department"
          | "Section"
          | "Course"
          | "Organization",
        entityId,
        limit,
      );
    } else if (startDate && endDate) {
      // 期間指定で検索
      logs = await HistoryRecorder.getChangeLogsByDateRange(
        new Date(startDate),
        new Date(endDate),
        entityType as
          | "Employee"
          | "Department"
          | "Section"
          | "Course"
          | "Organization"
          | undefined,
      );
    } else if (changeType) {
      // 変更タイプで検索
      logs = await HistoryRecorder.getChangeLogsByType(changeType, limit);
    } else {
      // 最新の履歴を取得
      logs = await HistoryRecorder.getRecentChangeLogs(limit);
    }

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/organization/history/statistics
 *
 * 変更統計を取得
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body as {
      startDate?: string;
      endDate?: string;
    };

    const statistics = await HistoryRecorder.getChangeStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 },
    );
  }
}
