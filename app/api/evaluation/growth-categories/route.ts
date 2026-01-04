import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/growth-categories
 * 成長カテゴリ一覧を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.growthCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching growth categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluation/growth-categories
 * 成長カテゴリを作成
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
    const { name, nameEn, description, coefficient, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const category = await prisma.growthCategory.create({
      data: {
        name,
        nameEn,
        description,
        coefficient: coefficient || 1.0,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating growth category:", error);
    return NextResponse.json(
      { error: "Failed to create growth category" },
      { status: 500 }
    );
  }
}
