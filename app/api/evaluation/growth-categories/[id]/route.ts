import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/evaluation/growth-categories/[id] - 単一カテゴリ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const category = await prisma.growthCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch growth category:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth category" },
      { status: 500 }
    );
  }
}

// PATCH /api/evaluation/growth-categories/[id] - カテゴリ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, nameEn, description, coefficient, sortOrder, isActive } = body;

    const category = await prisma.growthCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(description !== undefined && { description }),
        ...(coefficient !== undefined && { coefficient }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update growth category:", error);
    return NextResponse.json(
      { error: "Failed to update growth category" },
      { status: 500 }
    );
  }
}

// DELETE /api/evaluation/growth-categories/[id] - カテゴリ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 使用中のカテゴリかチェック
    const usedInEvaluations = await prisma.evaluation.count({
      where: { growthCategoryId: id },
    });

    if (usedInEvaluations > 0) {
      return NextResponse.json(
        { error: "Cannot delete category used in evaluations" },
        { status: 400 }
      );
    }

    await prisma.growthCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete growth category:", error);
    return NextResponse.json(
      { error: "Failed to delete growth category" },
      { status: 500 }
    );
  }
}
