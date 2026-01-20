import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ procedureId: string; imageId: string }>;
}

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * 画像ファイル配信（認証必須）
 * GET /api/backoffice/procedures/[procedureId]/images/[imageId]/file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // ファイルパスを構築
    const processId = image.workProcedure.businessProcess.id;
    const filepath = join(
      process.cwd(),
      "storage",
      "procedure-images",
      processId,
      procedureId,
      image.filename
    );

    // ファイルを読み込み
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(filepath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Content-Type を決定
    const extension = image.filename.split(".").pop()?.toLowerCase() || "png";
    const contentType = MIME_TYPES[extension] || "application/octet-stream";

    // キャッシュヘッダー付きでレスポンスを返す
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600", // 1時間キャッシュ（認証済みユーザーのみ）
      },
    });
  } catch (error) {
    console.error("Failed to serve procedure image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
