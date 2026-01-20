/**
 * チケット販売記録API
 * GET: 販売記録一覧取得
 * POST: 販売記録作成
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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

/**
 * GET /api/ticket-sales/sales
 * 販売記録一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerId = searchParams.get("customerId");
    const productId = searchParams.get("productId");
    const paymentMethod = searchParams.get("paymentMethod");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const where: {
      soldAt?: { gte?: Date; lte?: Date };
      customerId?: string;
      productId?: string;
      paymentMethod?: "CASH" | "PAYROLL";
    } = {};

    // 日付範囲フィルタ
    if (from || to) {
      where.soldAt = {};
      if (from) {
        where.soldAt.gte = new Date(from);
      }
      if (to) {
        // 終了日は当日の23:59:59まで含める
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.soldAt.lte = toDate;
      }
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (paymentMethod === "CASH" || paymentMethod === "PAYROLL") {
      where.paymentMethod = paymentMethod;
    }

    const sales = await prisma.ticketSale.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, customerId: true, company: true },
        },
        product: {
          select: { id: true, code: true, name: true, nameJa: true },
        },
      },
      orderBy: { soldAt: "desc" },
      take: limit ? parseInt(limit, 10) : 100,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    // 合計件数も返す
    const total = await prisma.ticketSale.count({ where });

    return NextResponse.json({ sales, total });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ticket-sales/sales
 * 販売記録を作成（F/E Webアプリからも利用可能）
 */
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const logger = createApiLogger(request);

  try {
    // 認証チェック（APIキー優先、またはセッション認証）
    const apiKeyConfig = await validateTicketSalesApiKey(request);
    const session = apiKeyConfig ? null : await auth();

    // APIキー認証でもセッション認証（ADMIN）でもない場合は拒否
    if (!apiKeyConfig && !session?.user) {
      await logger.log(401, null, "Unauthorized");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // セッション認証の場合、ADMIN必須
    if (!apiKeyConfig && session?.user && session.user.role !== "ADMIN") {
      await logger.log(403, null, "Forbidden");
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      customerId,
      customerName,
      productId,
      quantity,
      paymentMethod,
      adminNfcId,
      adminName,
      notes,
    } = body;

    // 必須項目チェック
    if (
      !customerName ||
      !productId ||
      !quantity ||
      !paymentMethod ||
      !adminNfcId ||
      !adminName
    ) {
      return NextResponse.json(
        {
          error:
            "customerName, productId, quantity, paymentMethod, adminNfcId, adminName are required",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // 商品情報を取得
    const product = await prisma.ticketProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: "Product is not available" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 数量のバリデーション
    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 支払方法のバリデーション
    if (paymentMethod !== "CASH" && paymentMethod !== "PAYROLL") {
      return NextResponse.json(
        { error: "paymentMethod must be CASH or PAYROLL" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 合計金額を計算
    const totalPrice = product.unitPrice * quantity;

    const sale = await prisma.ticketSale.create({
      data: {
        customerId: customerId || null,
        customerName,
        productId,
        productCode: product.code,
        quantity,
        unitPrice: product.unitPrice,
        totalPrice,
        paymentMethod,
        adminNfcId,
        adminName,
        notes: notes || null,
      },
      include: {
        customer: {
          select: { id: true, name: true, customerId: true },
        },
        product: {
          select: { id: true, code: true, name: true, nameJa: true },
        },
      },
    });

    // APIキー経由のアクセスのみログ記録
    if (apiKeyConfig) {
      await logger.log(201, apiKeyConfig.id);
    }
    return NextResponse.json(sale, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating sale:", error);
    await logger.log(500, null, "Failed to create sale");
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500, headers: corsHeaders },
    );
  }
}
