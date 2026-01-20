/**
 * チケット販売記録詳細API
 * GET: 販売記録詳細取得
 * DELETE: 販売記録削除（取消）
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ticket-sales/sales/[id]
 * 販売記録詳細を取得
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

    const sale = await prisma.ticketSale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerId: true,
            company: true,
            email: true,
            paymentDay: true,
          },
        },
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameJa: true,
            unitPrice: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ticket-sales/sales/[id]
 * 販売記録を削除（取消）
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

    // 既存の販売記録を確認
    const existing = await prisma.ticketSale.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // 物理削除
    await prisma.ticketSale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 },
    );
  }
}
