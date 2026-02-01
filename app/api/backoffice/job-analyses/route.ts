import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI業務分析一覧取得
 * GET /api/backoffice/job-analyses
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const analyses = await prisma.jobAnalysis.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        tags: true,
        version: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Failed to fetch job analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch job analyses" },
      { status: 500 },
    );
  }
}

/**
 * AI業務分析新規作成
 * POST /api/backoffice/job-analyses
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, inputMaterials, tags } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    const analysis = await prisma.jobAnalysis.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        inputMaterials: inputMaterials?.trim() || null,
        tags: tags?.trim() || null,
        createdBy: session.user.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("Failed to create job analysis:", error);
    return NextResponse.json(
      { error: "Failed to create job analysis" },
      { status: 500 },
    );
  }
}
