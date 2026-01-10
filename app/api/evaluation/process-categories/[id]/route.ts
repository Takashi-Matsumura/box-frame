import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/evaluation/process-categories/[id] - 単一カテゴリ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const category = await prisma.processCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch process category:", error);
    return NextResponse.json(
      { error: "Failed to fetch process category" },
      { status: 500 },
    );
  }
}

// PATCH /api/evaluation/process-categories/[id] - カテゴリ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      nameEn,
      categoryCode,
      description,
      minItemCount,
      scores,
      sortOrder,
      isActive,
    } = body;

    // scoresがオブジェクトの場合はJSON文字列に変換
    const scoresJson =
      scores !== undefined
        ? typeof scores === "object"
          ? JSON.stringify(scores)
          : scores
        : undefined;

    const category = await prisma.processCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(categoryCode !== undefined && { categoryCode }),
        ...(description !== undefined && { description }),
        ...(minItemCount !== undefined && { minItemCount }),
        ...(scoresJson !== undefined && { scores: scoresJson }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update process category:", error);
    return NextResponse.json(
      { error: "Failed to update process category" },
      { status: 500 },
    );
  }
}

// DELETE /api/evaluation/process-categories/[id] - カテゴリ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 使用中のカテゴリかチェック（将来的に評価データとの関連があれば）
    await prisma.processCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process category:", error);
    return NextResponse.json(
      { error: "Failed to delete process category" },
      { status: 500 },
    );
  }
}
