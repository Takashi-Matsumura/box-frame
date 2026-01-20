import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 作業手順書一覧取得
 * GET /api/backoffice/processes/[id]/procedures
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // プロセスの存在確認
    const process = await prisma.businessProcess.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!process) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const procedures = await prisma.workProcedure.findMany({
      where: { businessProcessId: id },
      orderBy: { sortOrder: "asc" },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ procedures });
  } catch (error) {
    console.error("Failed to fetch procedures:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedures" },
      { status: 500 }
    );
  }
}

/**
 * 作業手順書作成
 * POST /api/backoffice/processes/[id]/procedures
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // プロセスの存在確認
    const process = await prisma.businessProcess.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!process) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 必須フィールド検証
    if (!body.diagramCellId || !body.taskName) {
      return NextResponse.json(
        { error: "diagramCellId and taskName are required" },
        { status: 400 }
      );
    }

    // 既存の手順書を確認
    const existing = await prisma.workProcedure.findUnique({
      where: {
        businessProcessId_diagramCellId: {
          businessProcessId: id,
          diagramCellId: body.diagramCellId,
        },
      },
    });

    if (existing) {
      // 既存の場合は更新
      const updated = await prisma.workProcedure.update({
        where: { id: existing.id },
        data: {
          taskName: body.taskName,
          taskType: body.taskType || "manual",
          actorName: body.actorName || null,
          swimlaneId: body.swimlaneId || null,
          procedureMd: body.procedureMd || null,
          sortOrder: body.sortOrder ?? existing.sortOrder,
        },
      });
      return NextResponse.json(updated);
    }

    // 新規作成
    const procedure = await prisma.workProcedure.create({
      data: {
        businessProcessId: id,
        diagramCellId: body.diagramCellId,
        swimlaneId: body.swimlaneId || null,
        taskName: body.taskName,
        taskType: body.taskType || "manual",
        actorName: body.actorName || null,
        procedureMd: body.procedureMd || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(procedure, { status: 201 });
  } catch (error) {
    console.error("Failed to create procedure:", error);
    return NextResponse.json(
      { error: "Failed to create procedure" },
      { status: 500 }
    );
  }
}
