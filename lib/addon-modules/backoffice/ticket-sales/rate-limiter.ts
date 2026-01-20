/**
 * レート制限ユーティリティ
 *
 * APIキーごとにリクエスト数を制限する
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// メモリ内でリクエスト数を追跡（サーバー再起動でリセット）
const rateLimitStore = new Map<string, RateLimitEntry>();

// 設定
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 10; // 1分間に10回まで

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // 1分ごとにクリーンアップ

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * レート制限をチェック
 *
 * @param key - 制限対象のキー（APIキーやIPアドレス）
 * @returns レート制限の結果
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // 新しいウィンドウを開始
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // 既存のウィンドウ内
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // カウントを増加
  entry.count += 1;

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * レート制限ヘッダーを生成
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}
