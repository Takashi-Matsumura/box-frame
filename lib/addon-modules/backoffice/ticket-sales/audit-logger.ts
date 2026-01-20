/**
 * チケット販売API監査ログユーティリティ
 *
 * 外部向けAPIのアクセスを記録し、セキュリティ監視に活用します。
 */

import { prisma } from "@/lib/prisma";

export interface AuditLogEntry {
  method: string;
  endpoint: string;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  origin?: string | null;
  apiKeyId?: string | null;
  errorMessage?: string | null;
  responseTimeMs?: number | null;
}

/**
 * クライアントIPアドレスを取得
 */
export function getClientIp(request: Request): string | null {
  // X-Forwarded-For ヘッダー（プロキシ経由の場合）
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // 最初のIPアドレスがクライアントのIP
    return forwardedFor.split(",")[0].trim();
  }

  // X-Real-IP ヘッダー（Nginx等）
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // その他のヘッダー
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

/**
 * リクエストからエンドポイントパスを抽出
 */
export function getEndpointPath(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return "unknown";
  }
}

/**
 * 監査ログを記録（非同期、エラーは握りつぶす）
 */
export async function logApiAccess(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.ticketSalesApiLog.create({
      data: {
        method: entry.method,
        endpoint: entry.endpoint,
        statusCode: entry.statusCode,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        origin: entry.origin,
        apiKeyId: entry.apiKeyId,
        errorMessage: entry.errorMessage,
        responseTimeMs: entry.responseTimeMs,
      },
    });
  } catch (error) {
    // ログ記録の失敗でAPIを止めないよう、エラーは握りつぶす
    console.error("[Audit Logger] Failed to record log:", error);
  }
}

/**
 * APIアクセスをログに記録するヘルパー
 * 使用例:
 * ```
 * const logger = createApiLogger(request);
 * // ... API処理 ...
 * await logger.log(200, apiKeyId);
 * ```
 */
export function createApiLogger(request: Request) {
  const startTime = Date.now();
  const method = request.method;
  const endpoint = getEndpointPath(request);
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const origin = request.headers.get("origin");

  return {
    log: async (
      statusCode: number,
      apiKeyId?: string | null,
      errorMessage?: string | null
    ) => {
      const responseTimeMs = Date.now() - startTime;
      await logApiAccess({
        method,
        endpoint,
        statusCode,
        ipAddress,
        userAgent,
        origin,
        apiKeyId,
        errorMessage,
        responseTimeMs,
      });
    },
  };
}

/**
 * 古いログを削除（デフォルト90日以上前のログ）
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.ticketSalesApiLog.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
