import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * AI業務分析個別取得
 * GET /api/backoffice/job-analyses/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Failed to fetch job analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch job analysis" },
      { status: 500 },
    );
  }
}

/**
 * AI業務分析更新
 * PUT /api/backoffice/job-analyses/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.jobAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedBy: session.user.id,
    };

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.inputMaterials !== undefined)
      updateData.inputMaterials = body.inputMaterials?.trim() || null;
    if (body.jobDescriptionMd !== undefined)
      updateData.jobDescriptionMd = body.jobDescriptionMd?.trim() || null;
    if (body.chatHistory !== undefined)
      updateData.chatHistory = body.chatHistory;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.tags !== undefined) updateData.tags = body.tags?.trim() || null;
    if (body.version !== undefined) updateData.version = body.version;

    const updated = await prisma.jobAnalysis.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update job analysis:", error);
    return NextResponse.json(
      { error: "Failed to update job analysis" },
      { status: 500 },
    );
  }
}

/**
 * AI業務分析削除
 * DELETE /api/backoffice/job-analyses/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.jobAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.jobAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job analysis:", error);
    return NextResponse.json(
      { error: "Failed to delete job analysis" },
      { status: 500 },
    );
  }
}
