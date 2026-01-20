/**
 * チケット販売顧客API
 * GET: 顧客一覧取得
 * POST: 顧客作成
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ticket-sales/customers
 * 顧客一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 管理者権限チェック
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const company = searchParams.get("company");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const where: {
      company?: string;
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        customerId?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (company) {
      where.company = company;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { customerId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.ticketCustomer.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ticket-sales/customers
 * 新しい顧客を作成
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
    const {
      name,
      customerId,
      nfcId,
      email,
      company,
      paymentDay,
      hasApproval,
      employeeId,
    } = body;

    // 必須項目チェック
    if (!name || !customerId || !company) {
      return NextResponse.json(
        { error: "name, customerId, company are required" },
        { status: 400 },
      );
    }

    const customer = await prisma.ticketCustomer.create({
      data: {
        name,
        customerId,
        nfcId: nfcId || null,
        email: email || null,
        company,
        paymentDay: paymentDay ?? 25,
        hasApproval: hasApproval ?? false,
        employeeId: employeeId || null,
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true },
        },
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating customer:", error);

    // 一意制約違反
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
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
