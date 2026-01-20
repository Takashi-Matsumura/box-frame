/**
 * チケット販売APIキー関連ユーティリティ
 */

import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

/**
 * APIキーをハッシュ化
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * 新しいAPIキーを生成（32バイト = 64文字の16進数）
 */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

export interface ApiKeyValidationResult {
  id: string;
  adminNfcId: string;
  adminEmail: string;
}

/**
 * X-API-Keyヘッダーからリクエストを検証
 * @returns APIキー設定（id, adminNfcId, adminEmail含む）、無効な場合はnull
 */
export async function validateTicketSalesApiKey(
  request: Request
): Promise<ApiKeyValidationResult | null> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return null;
  }

  const hashedKey = hashApiKey(apiKey);

  const apiKeyRecord = await prisma.ticketSalesApiKey.findUnique({
    where: { apiKey: hashedKey },
  });

  if (!apiKeyRecord) {
    return null;
  }

  // 有効期限のチェック
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    console.warn(
      `[API Key] Expired API key used. Key ID: ${apiKeyRecord.id}, Expired at: ${apiKeyRecord.expiresAt.toISOString()}`
    );
    return null;
  }

  return {
    id: apiKeyRecord.id,
    adminNfcId: apiKeyRecord.adminNfcId,
    adminEmail: apiKeyRecord.adminEmail,
  };
}

/**
 * デフォルトの有効期限を計算（90日後）
 */
export function getDefaultExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date;
}
