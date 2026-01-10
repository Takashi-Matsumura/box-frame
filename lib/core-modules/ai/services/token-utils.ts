/**
 * トークン推定ユーティリティ
 *
 * 正確なトークン数は各モデルのトークナイザーに依存しますが、
 * 教育目的のため近似値を使用します。
 *
 * 一般的な目安:
 * - 英語: 1トークン ≈ 4文字 または 0.75語
 * - 日本語: 1トークン ≈ 1-2文字（ひらがな/カタカナは1文字≈1トークン、漢字は1文字≈1-2トークン）
 */

import type { ContextUsage } from "../types";
import { TOKEN_ESTIMATION, CONTEXT_WINDOW_SIZES } from "../constants";

/**
 * テキストからトークン数を推定
 * 日本語と英語の混在を考慮
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // 日本語文字（ひらがな、カタカナ、漢字）をカウント
  const japaneseChars =
    text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g)?.length || 0;

  // 非日本語部分の長さ
  const nonJapaneseLength = text.length - japaneseChars;

  // 日本語: 約1.5文字で1トークン（平均）
  // 英語/数字/記号: 約4文字で1トークン
  const japaneseTokens = Math.ceil(
    japaneseChars / TOKEN_ESTIMATION.japaneseCharsPerToken
  );
  const englishTokens = Math.ceil(
    nonJapaneseLength / TOKEN_ESTIMATION.englishCharsPerToken
  );

  return japaneseTokens + englishTokens;
}

/**
 * メッセージ配列の総トークン数を推定
 */
export function estimateMessagesTokens(
  messages: { role: string; content: string }[]
): number {
  let total = 0;

  for (const msg of messages) {
    total += TOKEN_ESTIMATION.messageOverhead;
    total += estimateTokens(msg.content);
  }

  total += TOKEN_ESTIMATION.totalOverhead;

  return total;
}

/**
 * モデルごとのコンテキストウィンドウサイズを取得
 */
export function getContextWindowSize(provider: string, model: string): number {
  // OpenAI models
  if (provider === "openai" || provider === "OpenAI") {
    if (model.includes("gpt-4o")) return CONTEXT_WINDOW_SIZES["gpt-4o"];
    if (model.includes("gpt-4-turbo")) return CONTEXT_WINDOW_SIZES["gpt-4-turbo"];
    if (model.includes("gpt-4-32k")) return CONTEXT_WINDOW_SIZES["gpt-4-32k"];
    if (model.includes("gpt-4")) return CONTEXT_WINDOW_SIZES["gpt-4"];
    if (model.includes("gpt-3.5-turbo-16k"))
      return CONTEXT_WINDOW_SIZES["gpt-3.5-turbo-16k"];
    if (model.includes("gpt-3.5")) return CONTEXT_WINDOW_SIZES["gpt-3.5-turbo"];
    return CONTEXT_WINDOW_SIZES.default;
  }

  // Anthropic models
  if (provider === "anthropic" || provider === "Anthropic") {
    if (model.includes("claude-3")) return CONTEXT_WINDOW_SIZES["claude-3"];
    if (model.includes("claude-2")) return CONTEXT_WINDOW_SIZES["claude-2"];
    return CONTEXT_WINDOW_SIZES["claude-2"];
  }

  // Local LLMs
  if (
    provider === "ollama" ||
    provider === "llama.cpp" ||
    provider === "lm-studio"
  ) {
    if (model.toLowerCase().includes("gemma")) {
      return CONTEXT_WINDOW_SIZES.gemma;
    }
    if (model.toLowerCase().includes("llama")) {
      if (model.includes("3.2") || model.includes("3.1"))
        return CONTEXT_WINDOW_SIZES["llama-3.2"];
      if (model.includes("3")) return CONTEXT_WINDOW_SIZES["llama-3"];
      return CONTEXT_WINDOW_SIZES.llama;
    }
    if (model.toLowerCase().includes("mistral"))
      return CONTEXT_WINDOW_SIZES.mistral;
    if (model.toLowerCase().includes("phi")) return CONTEXT_WINDOW_SIZES.phi;
    return CONTEXT_WINDOW_SIZES.default;
  }

  return CONTEXT_WINDOW_SIZES.default;
}

/**
 * トークン使用率を計算
 */
export function calculateContextUsage(
  inputTokens: number,
  outputTokens: number,
  contextWindow: number
): ContextUsage {
  const used = inputTokens + outputTokens;
  const percentage = Math.min((used / contextWindow) * 100, 100);
  const remaining = Math.max(contextWindow - used, 0);

  return {
    used,
    total: contextWindow,
    percentage,
    remaining,
  };
}

/**
 * トークン数を読みやすい形式でフォーマット
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}
