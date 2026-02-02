import pdf from "pdf-parse/lib/pdf-parse.js";
import { auth } from "@/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 100000; // 抽出テキストの最大文字数

/**
 * POST /api/ai/chat/upload-pdf
 * PDFファイルをアップロードしてテキストを抽出
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ファイルタイプの検証
    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({
          error: "Invalid file type. Only PDF files are accepted.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // PDFからテキストを抽出
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);

    // テキストが長すぎる場合は切り詰め
    let text = data.text;
    let truncated = false;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH);
      truncated = true;
    }

    return new Response(
      JSON.stringify({
        text,
        pages: data.numpages,
        filename: file.name,
        truncated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract text from PDF" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
