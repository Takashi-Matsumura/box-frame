/**
 * 管理者認証API（F/Eアプリ用）
 *
 * POST: NFCカードとAPIキーで管理者としてログインできるか検証
 */

import { NextResponse } from "next/server";
import { validateTicketSalesApiKey } from "@/lib/addon-modules/backoffice/ticket-sales/api-key-utils";

export async function POST(request: Request) {
  try {
    // APIキーの検証
    const apiKeyConfig = await validateTicketSalesApiKey(request);
    if (!apiKeyConfig) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // リクエストボディの取得
    const body = await request.json();
    const { nfcId } = body;

    if (!nfcId) {
      return NextResponse.json(
        { error: "nfcId is required" },
        { status: 400 }
      );
    }

    // NFC IDが管理者と一致するか検証
    if (nfcId !== apiKeyConfig.adminNfcId) {
      return NextResponse.json(
        { error: "NFC ID does not match admin" },
        { status: 403 }
      );
    }

    // 認証成功
    return NextResponse.json({
      success: true,
      admin: {
        nfcId: apiKeyConfig.adminNfcId,
        email: apiKeyConfig.adminEmail,
      },
    });
  } catch (error) {
    console.error("Error verifying admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
