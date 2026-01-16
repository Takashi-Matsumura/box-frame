import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 業務プロセス一覧取得
 * GET /api/backoffice/processes
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

    const processes = await prisma.businessProcess.findMany({
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

    return NextResponse.json(processes);
  } catch (error) {
    console.error("Failed to fetch business processes:", error);
    return NextResponse.json(
      { error: "Failed to fetch processes" },
      { status: 500 },
    );
  }
}

/**
 * 業務プロセス新規作成
 * POST /api/backoffice/processes
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, tags } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    const process = await prisma.businessProcess.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        tags: tags?.trim() || null,
        createdBy: session.user.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json(process, { status: 201 });
  } catch (error) {
    console.error("Failed to create business process:", error);
    return NextResponse.json(
      { error: "Failed to create process" },
      { status: 500 },
    );
  }
}
