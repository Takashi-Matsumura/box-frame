/**
 * チケット販売APIキー管理API
 *
 * GET: 現在のAPIキー設定を取得
 * POST: 新しいAPIキーを発行（古いキーは削除）
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateApiKey,
  hashApiKey,
  getDefaultExpiryDate,
} from "@/lib/addon-modules/backoffice/ticket-sales/api-key-utils";

/**
 * GET: 現在のAPIキー設定を取得
 * 注意: APIキー自体は返さない（ハッシュ化されており復元不可）
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeyRecord = await prisma.ticketSalesApiKey.findFirst();

    if (!apiKeyRecord) {
      return NextResponse.json({
        configured: false,
        adminNfcId: null,
        adminEmail: null,
        expiresAt: null,
        createdAt: null,
      });
    }

    // 有効期限が過ぎているかチェック
    const isExpired = apiKeyRecord.expiresAt
      ? apiKeyRecord.expiresAt < new Date()
      : false;

    return NextResponse.json({
      configured: true,
      adminNfcId: apiKeyRecord.adminNfcId,
      adminEmail: apiKeyRecord.adminEmail,
      expiresAt: apiKeyRecord.expiresAt,
      isExpired,
      createdAt: apiKeyRecord.createdAt,
    });
  } catch (error) {
    console.error("Error fetching API key config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: 新しいAPIキーを発行
 * リクエストボディ: { adminNfcId: string, adminEmail: string, expiresInDays?: number }
 * レスポンス: { apiKey: string, expiresAt: Date } (平文のAPIキー、この1回のみ表示)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adminNfcId, adminEmail, expiresInDays } = body;

    if (!adminNfcId || !adminEmail) {
      return NextResponse.json(
        { error: "adminNfcId and adminEmail are required" },
        { status: 400 }
      );
    }

    // 新しいAPIキーを生成
    const plainApiKey = generateApiKey();
    const hashedApiKey = hashApiKey(plainApiKey);

    // 有効期限を設定（デフォルト90日、指定があればその日数）
    let expiresAt: Date | null = null;
    if (expiresInDays === null || expiresInDays === 0) {
      // 明示的にnullまたは0が指定された場合は無期限
      expiresAt = null;
    } else if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    } else {
      // デフォルト: 90日
      expiresAt = getDefaultExpiryDate();
    }

    // トランザクションで古いキーを削除し、新しいキーを作成
    await prisma.$transaction(async (tx) => {
      // 全ての既存キーを削除
      await tx.ticketSalesApiKey.deleteMany();

      // 新しいキーを作成
      await tx.ticketSalesApiKey.create({
        data: {
          apiKey: hashedApiKey,
          adminNfcId,
          adminEmail,
          expiresAt,
        },
      });
    });

    // 平文のAPIキーを返す（この1回のみ）
    return NextResponse.json({
      success: true,
      apiKey: plainApiKey,
      expiresAt,
      message: expiresAt
        ? `API key generated (valid until ${expiresAt.toISOString()}). Store this key securely - it will not be shown again.`
        : "API key generated (no expiration). Store this key securely - it will not be shown again.",
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
