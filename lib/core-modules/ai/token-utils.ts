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

/**
 * テキストからトークン数を推定
 * 日本語と英語の混在を考慮
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // 日本語文字（ひらがな、カタカナ、漢字）をカウント
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g)?.length || 0;

  // 非日本語部分の長さ
  const nonJapaneseLength = text.length - japaneseChars;

  // 日本語: 約1.5文字で1トークン（平均）
  // 英語/数字/記号: 約4文字で1トークン
  const japaneseTokens = Math.ceil(japaneseChars / 1.5);
  const englishTokens = Math.ceil(nonJapaneseLength / 4);

  return japaneseTokens + englishTokens;
}

/**
 * メッセージ配列の総トークン数を推定
 */
export function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
  let total = 0;

  for (const msg of messages) {
    // メッセージのオーバーヘッド（role, 区切り等）: 約4トークン
    total += 4;
    total += estimateTokens(msg.content);
  }

  // 全体のオーバーヘッド（開始/終了トークン等）: 約3トークン
  total += 3;

  return total;
}

/**
 * モデルごとのコンテキストウィンドウサイズを取得
 */
export function getContextWindowSize(provider: string, model: string): number {
  // OpenAI models
  if (provider === "openai" || provider === "OpenAI") {
    if (model.includes("gpt-4o")) return 128000;
    if (model.includes("gpt-4-turbo")) return 128000;
    if (model.includes("gpt-4-32k")) return 32768;
    if (model.includes("gpt-4")) return 8192;
    if (model.includes("gpt-3.5-turbo-16k")) return 16384;
    if (model.includes("gpt-3.5")) return 4096;
    return 4096;
  }

  // Anthropic models
  if (provider === "anthropic" || provider === "Anthropic") {
    if (model.includes("claude-3")) return 200000;
    if (model.includes("claude-2")) return 100000;
    return 100000;
  }

  // Local LLMs - common context sizes
  if (provider === "ollama" || provider === "llama.cpp" || provider === "lm-studio") {
    // Gemma models
    if (model.toLowerCase().includes("gemma")) {
      if (model.includes("3n") || model.includes("2b")) return 8192;
      return 8192;
    }
    // Llama models
    if (model.toLowerCase().includes("llama")) {
      if (model.includes("3.2") || model.includes("3.1")) return 128000;
      if (model.includes("3")) return 8192;
      return 4096;
    }
    // Mistral models
    if (model.toLowerCase().includes("mistral")) return 32768;
    // Phi models
    if (model.toLowerCase().includes("phi")) return 4096;
    // Default for unknown local models
    return 4096;
  }

  // Default
  return 4096;
}

/**
 * トークン使用率を計算
 */
export function calculateContextUsage(
  inputTokens: number,
  outputTokens: number,
  contextWindow: number
): {
  used: number;
  total: number;
  percentage: number;
  remaining: number;
} {
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
