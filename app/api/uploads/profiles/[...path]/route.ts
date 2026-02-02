import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * GET /api/uploads/profiles/[...path]
 *
 * プロフィール画像を配信（認証必須）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: pathSegments } = await params;
    const fileName = pathSegments.join("/");

    // パストラバーサル防止
    if (fileName.includes("..") || fileName.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // 拡張子チェック
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const filePath = join(process.cwd(), "uploads", "profiles", fileName);

    const fileBuffer = await readFile(filePath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("Error serving profile image:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}
