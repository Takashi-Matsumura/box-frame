import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/summarize
 *
 * テキスト要約API（外部モジュール向け）
 *
 * テキストを要約します。要約の長さと出力言語を指定できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "text": "長い議事録テキスト...",
 *   "length": "short",
 *   "language": "ja"
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "summary": "要約されたテキスト...",
 *   "provider": "local",
 *   "model": "llama.cpp/gemma-3n"
 * }
 * ```
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, length, language } = body;

    // バリデーション
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required and must be a string" },
        { status: 400 }
      );
    }

    if (length !== undefined && !["short", "medium", "long"].includes(length)) {
      return NextResponse.json(
        { error: "length must be 'short', 'medium', or 'long'" },
        { status: 400 }
      );
    }

    if (language !== undefined && !["ja", "en"].includes(language)) {
      return NextResponse.json(
        { error: "language must be 'ja' or 'en'" },
        { status: 400 }
      );
    }

    const response = await AIService.summarize({
      text,
      length,
      language,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI summarize:", error);
    const message = error instanceof Error ? error.message : "Failed to summarize text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
