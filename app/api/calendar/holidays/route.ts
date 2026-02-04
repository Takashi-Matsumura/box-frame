import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/holidays - 祝日一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type"); // national, company, or all

  // Build where clause
  const where: {
    date?: { gte?: Date; lte?: Date };
    type?: string;
  } = {};

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (type && type !== "all") {
    where.type = type;
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" },
  });

  // Format dates for frontend (YYYY-MM-DD)
  const formattedHolidays = holidays.map((h) => ({
    id: h.id,
    date: h.date.toISOString().split("T")[0],
    name: h.name,
    nameEn: h.nameEn,
    type: h.type,
    description: h.description,
  }));

  return NextResponse.json({ holidays: formattedHolidays });
}

// POST /api/calendar/holidays - 祝日作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { date, name, nameEn, type, description } = body;

  if (!date || !name) {
    return NextResponse.json(
      { error: "Date and name are required" },
      { status: 400 }
    );
  }

  try {
    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        name,
        nameEn: nameEn || null,
        type: type || "national",
        description: description || null,
      },
    });

    return NextResponse.json({
      holiday: {
        id: holiday.id,
        date: holiday.date.toISOString().split("T")[0],
        name: holiday.name,
        nameEn: holiday.nameEn,
        type: holiday.type,
        description: holiday.description,
      },
    });
  } catch (error) {
    console.error("Failed to create holiday:", error);
    return NextResponse.json(
      { error: "Failed to create holiday" },
      { status: 500 }
    );
  }
}
