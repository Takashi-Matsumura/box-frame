import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/calendar/holidays/[id] - 祝日更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { date, name, nameEn, type, description } = body;

  // Check if holiday exists
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }

  try {
    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn: nameEn || null }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description: description || null }),
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
    console.error("Failed to update holiday:", error);
    return NextResponse.json(
      { error: "Failed to update holiday" },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/holidays/[id] - 祝日削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Check if holiday exists
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }

  try {
    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete holiday:", error);
    return NextResponse.json(
      { error: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
