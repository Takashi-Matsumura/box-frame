import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/periods
 * 評価期間一覧を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periods = await prisma.evaluationPeriod.findMany({
      orderBy: [{ year: "desc" }, { term: "desc" }],
      include: {
        _count: {
          select: { evaluations: true },
        },
      },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("Error fetching evaluation periods:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation periods" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluation/periods
 * 評価期間を作成
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, year, term, startDate, endDate } = body;

    if (!name || !year || !term || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 重複チェック
    const existing = await prisma.evaluationPeriod.findFirst({
      where: { year, term },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Period already exists for this year and term" },
        { status: 400 },
      );
    }

    const period = await prisma.evaluationPeriod.create({
      data: {
        name,
        year,
        term,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "DRAFT",
      },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation period:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation period" },
      { status: 500 },
    );
  }
}
