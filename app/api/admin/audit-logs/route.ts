import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AuditService,
  type AuditCategory,
  type AuditAction,
} from "@/lib/services/audit-service";

/**
 * GET /api/admin/audit-logs
 * 監査ログを取得（管理者のみ）
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as AuditCategory | null;
    const action = searchParams.get("action") as AuditAction | null;
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await AuditService.getLogs({
      category: category || undefined,
      action: action || undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Math.min(limit, 100), // 最大100件
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
