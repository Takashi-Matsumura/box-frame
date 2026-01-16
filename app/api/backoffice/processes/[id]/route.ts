import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 業務プロセス個別取得
 * GET /api/backoffice/processes/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const process = await prisma.businessProcess.findUnique({
      where: { id },
    });

    if (!process) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("Failed to fetch business process:", error);
    return NextResponse.json(
      { error: "Failed to fetch process" },
      { status: 500 },
    );
  }
}

/**
 * 業務プロセス更新
 * PUT /api/backoffice/processes/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.businessProcess.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedBy: session.user.id,
    };

    // 更新可能フィールド
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.flowDescription !== undefined)
      updateData.flowDescription = body.flowDescription;
    if (body.interviewHistory !== undefined)
      updateData.interviewHistory = body.interviewHistory;
    if (body.diagramXml !== undefined) {
      updateData.diagramXml = body.diagramXml;
      // XMLが更新された場合はバージョンを上げる
      updateData.version = existing.version + 1;
    }
    if (body.tags !== undefined) updateData.tags = body.tags?.trim() || null;

    const updated = await prisma.businessProcess.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update business process:", error);
    return NextResponse.json(
      { error: "Failed to update process" },
      { status: 500 },
    );
  }
}

/**
 * 業務プロセス削除
 * DELETE /api/backoffice/processes/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.businessProcess.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.businessProcess.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete business process:", error);
    return NextResponse.json(
      { error: "Failed to delete process" },
      { status: 500 },
    );
  }
}
