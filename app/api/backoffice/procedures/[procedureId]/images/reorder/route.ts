import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ procedureId: string }>;
}

/**
 * 画像順序変更
 * PUT /api/backoffice/procedures/[procedureId]/images/reorder
 *
 * Body: { imageIds: string[] } - 新しい順序での画像ID配列
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { procedureId } = await params;
    const body = await request.json();
    const { imageIds } = body as { imageIds: string[] };

    if (!imageIds || !Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "imageIds array is required" },
        { status: 400 }
      );
    }

    // 手順書の存在確認
    const procedure = await prisma.workProcedure.findUnique({
      where: { id: procedureId },
      include: {
        images: { select: { id: true } },
      },
    });

    if (!procedure) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 });
    }

    // 全ての画像IDが手順書に属しているか確認
    const existingIds = new Set(procedure.images.map((img) => img.id));
    const allValid = imageIds.every((id) => existingIds.has(id));

    if (!allValid || imageIds.length !== procedure.images.length) {
      return NextResponse.json(
        { error: "Invalid imageIds" },
        { status: 400 }
      );
    }

    // トランザクションで順序を更新
    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.procedureImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    // 更新後の画像リストを返す
    const images = await prisma.procedureImage.findMany({
      where: { workProcedureId: procedureId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Failed to reorder procedure images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}
