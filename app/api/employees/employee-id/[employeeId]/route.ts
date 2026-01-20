/**
 * 社員番号による社員情報取得API（チケット販売システム用）
 *
 * GET: 社員番号で社員情報を検索
 *
 * セキュリティ:
 * - APIキー認証必須
 * - レート制限: 1分間に10回まで
 * - CORS制限
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTicketSalesApiKey } from "@/lib/addon-modules/backoffice/ticket-sales/api-key-utils";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/addon-modules/backoffice/ticket-sales/rate-limiter";
import {
  getCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/addon-modules/backoffice/ticket-sales/cors";
import { createApiLogger } from "@/lib/addon-modules/backoffice/ticket-sales/audit-logger";

// OPTIONSリクエスト（プリフライト）
export async function OPTIONS(request: Request) {
  const preflightResponse = handleCorsPreflightResponse(request);
  if (preflightResponse) return preflightResponse;
  return new Response(null, { status: 405 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  const logger = createApiLogger(request);

  try {
    // APIキーの検証
    const apiKeyConfig = await validateTicketSalesApiKey(request);
    if (!apiKeyConfig) {
      await logger.log(401, null, "Invalid API key");
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    // レート制限のチェック（APIキーごとに制限）
    const apiKey = request.headers.get("X-API-Key") || "unknown";
    const rateLimitResult = checkRateLimit(`employee-api:${apiKey}`);

    if (!rateLimitResult.allowed) {
      await logger.log(429, apiKeyConfig.id, "Rate limit exceeded");
      return NextResponse.json(
        {
          error: "リクエスト数が上限を超えました。しばらくしてから再試行してください",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult) },
        }
      );
    }

    const { employeeId } = await params;

    if (!employeeId) {
      await logger.log(400, apiKeyConfig.id, "employeeId is required");
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 社員番号で社員を検索
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        id: true,
        name: true,
        employeeId: true,
        employmentType: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      await logger.log(404, apiKeyConfig.id, "Employee not found");
      return NextResponse.json(
        { error: "該当する社員が見つかりません" },
        {
          status: 404,
          headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult) },
        }
      );
    }

    await logger.log(200, apiKeyConfig.id);
    return NextResponse.json(employee, {
      headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult) },
    });
  } catch (error) {
    console.error("Error fetching employee by employeeId:", error);
    await logger.log(500, null, "Internal server error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
