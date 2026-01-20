/**
 * 商品一覧（公開版）API（F/Eアプリ用）
 *
 * GET: 有効な商品一覧を取得
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTicketSalesApiKey } from "@/lib/addon-modules/backoffice/ticket-sales/api-key-utils";
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

export async function GET(request: Request) {
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

    // 有効な商品を取得（sortOrder昇順）
    const products = await prisma.ticketProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        nameJa: true,
        unitPrice: true,
        defaultQuantity: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    await logger.log(200, apiKeyConfig.id);
    return NextResponse.json(products, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching public products:", error);
    await logger.log(500, null, "Internal server error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
