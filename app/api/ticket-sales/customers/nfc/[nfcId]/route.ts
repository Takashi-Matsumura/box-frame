/**
 * NFC IDによる顧客検索API（F/Eアプリ用）
 *
 * GET: NFC IDで顧客を検索
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nfcId: string }> }
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

    const { nfcId } = await params;

    if (!nfcId) {
      await logger.log(400, apiKeyConfig.id, "nfcId is required");
      return NextResponse.json(
        { error: "nfcId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // NFC IDで顧客を検索
    const customer = await prisma.ticketCustomer.findUnique({
      where: { nfcId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      await logger.log(404, apiKeyConfig.id, "Customer not found");
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 非アクティブな顧客はエラー
    if (!customer.isActive) {
      await logger.log(404, apiKeyConfig.id, "Customer is inactive");
      return NextResponse.json(
        { error: "Customer is inactive" },
        { status: 404, headers: corsHeaders }
      );
    }

    await logger.log(200, apiKeyConfig.id);
    return NextResponse.json(customer, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching customer by NFC ID:", error);
    await logger.log(500, null, "Internal server error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
