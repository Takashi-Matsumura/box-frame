import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ procedureId: string; imageId: string }>;
}

/**
 * キャプション更新
 * PUT /api/backoffice/procedures/[procedureId]/images/[imageId]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { procedureId, imageId } = await params;
    const body = await request.json();

    // 画像の存在確認
    const image = await prisma.procedureImage.findFirst({
      where: {
        id: imageId,
        workProcedureId: procedureId,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // キャプション更新
    const updated = await prisma.procedureImage.update({
      where: { id: imageId },
      data: {
        caption: body.caption !== undefined ? body.caption : image.caption,
      },
    });

    return NextResponse.json({ image: updated });
  } catch (error) {
    console.error("Failed to update procedure image:", error);
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }
}

/**
 * 画像削除
 * DELETE /api/backoffice/procedures/[procedureId]/images/[imageId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { procedureId, imageId } = await params;

    // 画像の存在確認（手順書の情報も取得）
    const image = await prisma.procedureImage.findFirst({
      where: {
        id: imageId,
        workProcedureId: procedureId,
      },
      include: {
        workProcedure: {
          include: {
            businessProcess: { select: { id: true } },
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // ファイルを削除（非公開ストレージから）
    const processId = image.workProcedure.businessProcess.id;
    const filepath = join(
      process.cwd(),
      "storage",
      "procedure-images",
      processId,
      procedureId,
      image.filename
    );

    try {
      await unlink(filepath);
    } catch (error) {
      console.error("Failed to delete image file:", error);
      // ファイル削除に失敗してもDB削除は続行
    }

    // DBから削除
    await prisma.procedureImage.delete({
      where: { id: imageId },
    });

    // 残りの画像の sortOrder を再調整
    const remainingImages = await prisma.procedureImage.findMany({
      where: { workProcedureId: procedureId },
      orderBy: { sortOrder: "asc" },
    });

    for (let i = 0; i < remainingImages.length; i++) {
      if (remainingImages[i].sortOrder !== i) {
        await prisma.procedureImage.update({
          where: { id: remainingImages[i].id },
          data: { sortOrder: i },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete procedure image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
