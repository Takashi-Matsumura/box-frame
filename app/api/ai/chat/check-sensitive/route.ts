import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

const SYSTEM_PROMPT_JA = `あなたはテキスト内の機密情報を検出するセキュリティアナリストです。
以下のカテゴリに該当する情報がテキストに含まれているか判定してください。

カテゴリ:
- trade_secret: 営業秘密（事業戦略、未発表製品情報、競合分析、内部方針）
- financial_data: 財務データ（売上高、利益率、予算額、原価、具体的な金額を伴う財務情報）
- personal_info: 個人情報（人名と紐づく健康情報、人事評価、懲戒情報、成績）
- credentials: 認証情報（パスワード、APIキー、トークン、秘密鍵）
- legal: 法的情報（契約条件の詳細、訴訟情報、和解金額）

回答は以下のJSON形式のみで出力してください。他のテキストは不要です:
{"items":[{"category":"カテゴリ名","description":"検出内容の簡潔な説明","severity":"high|medium|low"}]}

検出なしの場合: {"items":[]}`;

const SYSTEM_PROMPT_EN = `You are a security analyst detecting confidential information in text.
Determine if the text contains information in the following categories:

Categories:
- trade_secret: Trade secrets (business strategy, unreleased product info, competitive analysis, internal policies)
- financial_data: Financial data (revenue, profit margins, budget amounts, costs, specific financial figures)
- personal_info: Personal information (health info, performance reviews, disciplinary info linked to named individuals)
- credentials: Credentials (passwords, API keys, tokens, secret keys)
- legal: Legal information (contract terms, litigation details, settlement amounts)

Reply ONLY with the following JSON format. No other text:
{"items":[{"category":"category_name","description":"brief description of finding","severity":"high|medium|low"}]}

If nothing detected: {"items":[]}`;

/**
 * POST /api/ai/chat/check-sensitive
 * LLMベースの機密情報チェック（Stage 2）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, language } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 },
      );
    }

    const systemPrompt =
      language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA;

    // テキストが長すぎる場合は先頭部分のみチェック
    const truncatedText =
      text.length > 3000 ? text.slice(0, 3000) + "\n[...]" : text;

    const result = await AIService.generate({
      input: truncatedText,
      systemPrompt,
      temperature: 0.1,
      maxTokens: 500,
    });

    // JSONをパース
    let parsed: { items: Array<{ category: string; description: string; severity: string }> };
    try {
      let jsonStr = result.output.trim();
      // マークダウンコードブロックの除去
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // パース失敗時は空結果を返す（グレースフルデグラデーション）
      return NextResponse.json({
        detected: false,
        items: [],
      });
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return NextResponse.json({
      detected: items.length > 0,
      items: items.map((item) => ({
        category: item.category || "unknown",
        description: item.description || "",
        severity: ["high", "medium", "low"].includes(item.severity)
          ? item.severity
          : "medium",
      })),
    });
  } catch (error) {
    console.error("Error in sensitive data check:", error);
    // グレースフルデグラデーション: エラー時は空結果
    return NextResponse.json({
      detected: false,
      items: [],
    });
  }
}
