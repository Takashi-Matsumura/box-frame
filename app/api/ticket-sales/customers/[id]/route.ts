/**
 * チケット販売顧客詳細API
 * GET: 顧客詳細取得
 * PUT: 顧客更新
 * DELETE: 顧客削除
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ticket-sales/customers/[id]
 * 顧客詳細を取得
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

    const customer = await prisma.ticketCustomer.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        sales: {
          take: 10,
          orderBy: { soldAt: "desc" },
          include: {
            product: { select: { name: true, nameJa: true } },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/ticket-sales/customers/[id]
 * 顧客情報を更新
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

    const {
      name,
      customerId,
      nfcId,
      email,
      company,
      paymentDay,
      hasApproval,
      employeeId,
      isActive,
    } = body;

    // 既存の顧客を確認
    const existing = await prisma.ticketCustomer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const customer = await prisma.ticketCustomer.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        customerId: customerId ?? existing.customerId,
        nfcId: nfcId !== undefined ? nfcId || null : existing.nfcId,
        email: email !== undefined ? email || null : existing.email,
        company: company ?? existing.company,
        paymentDay: paymentDay ?? existing.paymentDay,
        hasApproval: hasApproval ?? existing.hasApproval,
        employeeId:
          employeeId !== undefined ? employeeId || null : existing.employeeId,
        isActive: isActive ?? existing.isActive,
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true },
        },
      },
    });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    console.error("Error updating customer:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.[0] || "field";
      return NextResponse.json(
        { error: `${field} is already registered` },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ticket-sales/customers/[id]
 * 顧客を削除（論理削除）
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

    // 既存の顧客を確認
    const existing = await prisma.ticketCustomer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // 論理削除
    await prisma.ticketCustomer.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 },
    );
  }
}
