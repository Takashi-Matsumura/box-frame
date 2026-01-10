import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/process-categories
 * プロセス評価項目一覧を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.processCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching process categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch process categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluation/process-categories
 * プロセス評価項目を作成
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      nameEn,
      categoryCode,
      description,
      minItemCount,
      scores,
      sortOrder,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // scoresがオブジェクトの場合はJSON文字列に変換
    const scoresJson =
      typeof scores === "object" ? JSON.stringify(scores) : scores || "{}";

    const category = await prisma.processCategory.create({
      data: {
        name,
        nameEn,
        categoryCode: categoryCode || "A",
        description,
        minItemCount: minItemCount ?? 0,
        scores: scoresJson,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating process category:", error);
    return NextResponse.json(
      { error: "Failed to create process category" },
      { status: 500 },
    );
  }
}
