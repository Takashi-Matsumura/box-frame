/**
 * NFCカード登録API（F/Eアプリ用）
 *
 * POST: 社員にNFCカードを紐づけ
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

export async function POST(request: Request) {
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

    const body = await request.json();
    const { employeeId, nfcId } = body;

    if (!employeeId || !nfcId) {
      await logger.log(400, apiKeyConfig.id, "employeeId and nfcId are required");
      return NextResponse.json(
        { error: "employeeId and nfcId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 社員を検索
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
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
    });

    if (!employee) {
      await logger.log(404, apiKeyConfig.id, "Employee not found");
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // トランザクション内でチェックと登録を原子的に実行（TOCTOU脆弱性対策）
    const customer = await prisma.$transaction(async (tx) => {
      // NFC IDが既に他の顧客に登録されているか確認
      const existingCustomer = await tx.ticketCustomer.findUnique({
        where: { nfcId },
      });

      if (existingCustomer && existingCustomer.employeeId !== employee.id) {
        throw new Error("NFC_CONFLICT");
      }

      // TicketCustomerを作成または更新
      return tx.ticketCustomer.upsert({
        where: { employeeId: employee.id },
        create: {
          name: employee.name,
          customerId: employee.employeeId,
          nfcId,
          company: employee.department?.name || "社員",
          employeeId: employee.id,
          hasApproval: false, // 承認フラグは管理者が設定
          isActive: true,
        },
        update: {
          nfcId,
          name: employee.name,
          company: employee.department?.name || "社員",
          isActive: true, // 再登録時にアクティブ化
        },
      });
    }).catch((error) => {
      if (error.message === "NFC_CONFLICT") {
        return null; // 競合を示すためnullを返す
      }
      throw error; // 他のエラーは再スロー
    });

    if (!customer) {
      await logger.log(409, apiKeyConfig.id, "NFC ID is already registered to another customer");
      return NextResponse.json(
        { error: "NFC ID is already registered to another customer" },
        { status: 409, headers: corsHeaders }
      );
    }

    await logger.log(200, apiKeyConfig.id);
    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          customerId: customer.customerId,
          nfcId: customer.nfcId,
          company: customer.company,
          hasApproval: customer.hasApproval,
          isActive: customer.isActive,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error registering NFC card:", error);
    await logger.log(500, null, "Internal server error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
