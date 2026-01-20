/**
 * チケット販売API用CORS設定
 *
 * 許可されたオリジンからのリクエストのみを受け付けます。
 * 環境変数 TICKET_SALES_ALLOWED_ORIGINS でカンマ区切りで許可オリジンを指定できます。
 * 例: TICKET_SALES_ALLOWED_ORIGINS=https://app1.example.com,https://app2.example.com
 *
 * 開発環境では localhost:3001 がデフォルトで許可されます。
 */

const DEFAULT_DEV_ORIGINS = ["http://localhost:3001", "http://127.0.0.1:3001"];

/**
 * 許可されたオリジンのリストを取得
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.TICKET_SALES_ALLOWED_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(",").map((origin) => origin.trim());
  }

  // 開発環境のデフォルト
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_ORIGINS;
  }

  // 本番環境で環境変数が未設定の場合は空（すべて拒否）
  return [];
}

/**
 * オリジンが許可されているかチェック
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    // オリジンがない場合（サーバー間通信など）は許可
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // 許可リストが空の場合は開発環境以外すべて拒否
  if (allowedOrigins.length === 0) {
    console.warn(
      "[CORS] No allowed origins configured. Set TICKET_SALES_ALLOWED_ORIGINS environment variable."
    );
    return false;
  }

  return allowedOrigins.includes(origin);
}

/**
 * CORSヘッダーを取得
 */
export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    "Access-Control-Max-Age": "86400", // 24時間キャッシュ
  };

  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

/**
 * OPTIONSリクエスト（プリフライト）用のレスポンスを生成
 */
export function handleCorsPreflightResponse(request: Request): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("Origin");

  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
