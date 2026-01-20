import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ procedureId: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_PROCEDURE = 10;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * 画像一覧取得
 * GET /api/backoffice/procedures/[procedureId]/images
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { procedureId } = await params;

    const procedure = await prisma.workProcedure.findUnique({
      where: { id: procedureId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!procedure) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 });
    }

    return NextResponse.json({ images: procedure.images });
  } catch (error) {
    console.error("Failed to fetch procedure images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

/**
 * 画像アップロード
 * POST /api/backoffice/procedures/[procedureId]/images
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { procedureId } = await params;

    // 手順書の存在確認
    const procedure = await prisma.workProcedure.findUnique({
      where: { id: procedureId },
      include: {
        businessProcess: { select: { id: true } },
        images: { select: { id: true } },
      },
    });

    if (!procedure) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 });
    }

    // 画像数の上限チェック
    if (procedure.images.length >= MAX_IMAGES_PER_PROCEDURE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES_PER_PROCEDURE} images per procedure` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ファイルタイプの検証
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" },
        { status: 400 }
      );
    }

    // ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // ファイル名の生成
    const timestamp = Date.now();
    const index = procedure.images.length + 1;
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${procedureId}-${timestamp}-${index}.${extension}`;

    // 保存先ディレクトリの作成（非公開ストレージ）
    const processId = procedure.businessProcess.id;
    const uploadDir = join(
      process.cwd(),
      "storage",
      "procedure-images",
      processId,
      procedureId
    );
    await mkdir(uploadDir, { recursive: true });

    // ファイルの保存
    const filepath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // DBに保存
    const image = await prisma.procedureImage.create({
      data: {
        workProcedureId: procedureId,
        filename,
        originalName: file.name,
        caption: caption || null,
        sortOrder: procedure.images.length,
      },
    });

    // 画像URLを返す（認証付きAPI経由）
    const imageUrl = `/api/backoffice/procedures/${procedureId}/images/${image.id}/file`;

    return NextResponse.json({
      success: true,
      image: {
        ...image,
        url: imageUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload procedure image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
