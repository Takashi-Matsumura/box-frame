import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/app-events - イベント一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: {
    userId: string;
    startTime?: { gte: Date };
    endTime?: { lte: Date };
  } = {
    userId: session.user.id,
  };

  if (startDate) {
    where.startTime = { gte: new Date(startDate) };
  }
  if (endDate) {
    // endDateの翌日の0時まで含める
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    where.endTime = { lte: end };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ events });
}

// POST /api/calendar/app-events - イベント作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    location,
    startTime,
    endTime,
    allDay,
    category,
    color,
  } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "title, startTime, endTime are required" },
      { status: 400 },
    );
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: session.user.id,
      title,
      description: description || null,
      location: location || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      allDay: allDay || false,
      category: category || "personal",
      color: color || null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
