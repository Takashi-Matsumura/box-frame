import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; procedureId: string }>;
}

/**
 * 作業手順書取得
 * GET /api/backoffice/processes/[id]/procedures/[procedureId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, procedureId } = await params;

    const procedure = await prisma.workProcedure.findFirst({
      where: {
        id: procedureId,
        businessProcessId: id,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!procedure) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(procedure);
  } catch (error) {
    console.error("Failed to fetch procedure:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedure" },
      { status: 500 }
    );
  }
}

/**
 * 作業手順書更新
 * PUT /api/backoffice/processes/[id]/procedures/[procedureId]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, procedureId } = await params;
    const body = await request.json();

    const existing = await prisma.workProcedure.findFirst({
      where: {
        id: procedureId,
        businessProcessId: id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.taskName !== undefined) updateData.taskName = body.taskName;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.actorName !== undefined) updateData.actorName = body.actorName || null;
    if (body.swimlaneId !== undefined) updateData.swimlaneId = body.swimlaneId || null;
    if (body.procedureMd !== undefined) updateData.procedureMd = body.procedureMd || null;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const updated = await prisma.workProcedure.update({
      where: { id: procedureId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update procedure:", error);
    return NextResponse.json(
      { error: "Failed to update procedure" },
      { status: 500 }
    );
  }
}

/**
 * 作業手順書削除
 * DELETE /api/backoffice/processes/[id]/procedures/[procedureId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, procedureId } = await params;

    const existing = await prisma.workProcedure.findFirst({
      where: {
        id: procedureId,
        businessProcessId: id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.workProcedure.delete({
      where: { id: procedureId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete procedure:", error);
    return NextResponse.json(
      { error: "Failed to delete procedure" },
      { status: 500 }
    );
  }
}
