import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService, type ExtractField } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/extract
 *
 * データ抽出API（外部モジュール向け）
 *
 * テキストから構造化データを抽出します。
 * 抽出するフィールドのスキーマを指定して、JSON形式でデータを取得できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "text": "田中太郎さん（35歳）は東京都在住で、エンジニアとして働いています。",
 *   "schema": [
 *     { "name": "name", "description": "人物の名前", "type": "string", "required": true },
 *     { "name": "age", "description": "年齢", "type": "number" },
 *     { "name": "location", "description": "居住地", "type": "string" },
 *     { "name": "occupation", "description": "職業", "type": "string" }
 *   ],
 *   "language": "ja"
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "data": {
 *     "name": "田中太郎",
 *     "age": 35,
 *     "location": "東京都",
 *     "occupation": "エンジニア"
 *   },
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
    const { text, schema, language } = body;

    // バリデーション
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required and must be a string" },
        { status: 400 },
      );
    }

    if (!schema || !Array.isArray(schema) || schema.length === 0) {
      return NextResponse.json(
        { error: "schema is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    // スキーマフィールドのバリデーション
    const validTypes = ["string", "number", "boolean", "array"];
    for (const field of schema as ExtractField[]) {
      if (!field.name || typeof field.name !== "string") {
        return NextResponse.json(
          { error: "Each schema field must have a 'name' string" },
          { status: 400 },
        );
      }
      if (!field.description || typeof field.description !== "string") {
        return NextResponse.json(
          { error: "Each schema field must have a 'description' string" },
          { status: 400 },
        );
      }
      if (!field.type || !validTypes.includes(field.type)) {
        return NextResponse.json(
          {
            error: `Each schema field must have a 'type' of: ${validTypes.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    if (language !== undefined && !["ja", "en"].includes(language)) {
      return NextResponse.json(
        { error: "language must be 'ja' or 'en'" },
        { status: 400 },
      );
    }

    const response = await AIService.extract({
      text,
      schema,
      language,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI extract:", error);
    const message =
      error instanceof Error ? error.message : "Failed to extract data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
