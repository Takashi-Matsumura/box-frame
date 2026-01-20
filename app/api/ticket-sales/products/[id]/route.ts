/**
 * チケット販売商品詳細API
 * GET: 商品詳細取得
 * PUT: 商品更新
 * DELETE: 商品削除（無効化）
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ticket-sales/products/[id]
 * 商品詳細を取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.ticketProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ticket-sales/products/[id]
 * 商品情報を更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { code, name, nameJa, description, unitPrice, sortOrder, isActive } =
      body;

    // 既存の商品を確認
    const existing = await prisma.ticketProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 単価のバリデーション
    if (
      unitPrice !== undefined &&
      (typeof unitPrice !== "number" || unitPrice < 0)
    ) {
      return NextResponse.json(
        { error: "unitPrice must be a non-negative number" },
        { status: 400 },
      );
    }

    const product = await prisma.ticketProduct.update({
      where: { id },
      data: {
        code: code ?? existing.code,
        name: name ?? existing.name,
        nameJa: nameJa ?? existing.nameJa,
        description:
          description !== undefined
            ? description || null
            : existing.description,
        unitPrice: unitPrice ?? existing.unitPrice,
        sortOrder: sortOrder ?? existing.sortOrder,
        isActive: isActive ?? existing.isActive,
      },
    });

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error updating product:", error);

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
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ticket-sales/products/[id]
 * 商品を削除（無効化）
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // 既存の商品を確認
    const existing = await prisma.ticketProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 論理削除（無効化）
    await prisma.ticketProduct.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
