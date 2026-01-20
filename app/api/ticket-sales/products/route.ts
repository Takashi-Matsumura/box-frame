/**
 * チケット販売商品API
 * GET: 商品一覧取得
 * POST: 商品作成
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ticket-sales/products
 * 商品一覧を取得
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
    const isActive = searchParams.get("isActive");

    const where: { isActive?: boolean } = {};

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const products = await prisma.ticketProduct.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ticket-sales/products
 * 新しい商品を作成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, nameJa, description, unitPrice, defaultQuantity, sortOrder } = body;

    // 必須項目チェック
    if (!code || !name || !nameJa || unitPrice === undefined) {
      return NextResponse.json(
        { error: "code, name, nameJa, unitPrice are required" },
        { status: 400 },
      );
    }

    // 単価のバリデーション
    if (typeof unitPrice !== "number" || unitPrice < 0) {
      return NextResponse.json(
        { error: "unitPrice must be a non-negative number" },
        { status: 400 },
      );
    }

    const product = await prisma.ticketProduct.create({
      data: {
        code,
        name,
        nameJa,
        description: description || null,
        unitPrice,
        defaultQuantity: defaultQuantity ?? 1,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating product:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Product code is already registered" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
