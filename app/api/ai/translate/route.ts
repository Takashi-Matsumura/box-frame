import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/translate
 * テキストを翻訳（認証済みユーザーのみ）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, sourceLanguage, targetLanguage } = body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: "text, sourceLanguage, and targetLanguage are required" },
        { status: 400 },
      );
    }

    if (
      !["ja", "en"].includes(sourceLanguage) ||
      !["ja", "en"].includes(targetLanguage)
    ) {
      return NextResponse.json(
        { error: "sourceLanguage and targetLanguage must be 'ja' or 'en'" },
        { status: 400 },
      );
    }

    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        translatedText: text,
        provider: "none",
        model: "none",
      });
    }

    const result = await AIService.translate({
      text,
      sourceLanguage,
      targetLanguage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error translating:", error);
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/ai/translate
 * AI翻訳が利用可能かどうかをチェック
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const available = await AIService.isAvailable();

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking AI availability:", error);
    return NextResponse.json({ available: false });
  }
}
