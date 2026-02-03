import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/app-events/[id] - イベント詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.calendarEvent.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

// PUT /api/calendar/app-events/[id] - イベント更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  // 所有者確認
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location }),
      ...(startTime !== undefined && { startTime: new Date(startTime) }),
      ...(endTime !== undefined && { endTime: new Date(endTime) }),
      ...(allDay !== undefined && { allDay }),
      ...(category !== undefined && { category }),
      ...(color !== undefined && { color }),
    },
  });

  return NextResponse.json({ event });
}

// DELETE /api/calendar/app-events/[id] - イベント削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 所有者確認
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.calendarEvent.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
