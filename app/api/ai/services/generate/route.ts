import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/generate
 *
 * 汎用テキスト生成API（外部モジュール向け）
 *
 * カスタムプロンプトを使用してAIでテキストを生成します。
 * 他のモジュールから呼び出して、様々なAIタスクに利用できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "input": "売上データ: 1月100万円、2月150万円、3月120万円",
 *   "systemPrompt": "あなたはビジネスアナリストです。データを分析してください。",
 *   "temperature": 0.5,
 *   "maxTokens": 1000
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "output": "売上分析結果...",
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
    const { input, systemPrompt, temperature, maxTokens } = body;

    // バリデーション
    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "input is required and must be a string" },
        { status: 400 }
      );
    }

    if (!systemPrompt || typeof systemPrompt !== "string") {
      return NextResponse.json(
        { error: "systemPrompt is required and must be a string" },
        { status: 400 }
      );
    }

    if (temperature !== undefined && (typeof temperature !== "number" || temperature < 0 || temperature > 2)) {
      return NextResponse.json(
        { error: "temperature must be a number between 0 and 2" },
        { status: 400 }
      );
    }

    if (maxTokens !== undefined && (typeof maxTokens !== "number" || maxTokens < 1 || maxTokens > 10000)) {
      return NextResponse.json(
        { error: "maxTokens must be a number between 1 and 10000" },
        { status: 400 }
      );
    }

    const response = await AIService.generate({
      input,
      systemPrompt,
      temperature,
      maxTokens,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI generate:", error);
    const message = error instanceof Error ? error.message : "Failed to generate text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
