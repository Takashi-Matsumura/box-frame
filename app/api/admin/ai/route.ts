import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai/ai-service";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/ai
 * AI設定を取得（管理者のみ）
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await AIService.getConfig();

    // APIキーはマスクして返す
    return NextResponse.json({
      config: {
        ...config,
        apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : null,
        hasApiKey: !!config.apiKey,
      },
    });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI config" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai
 * AI設定を更新（管理者のみ）
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, provider, apiKey, model } = body;

    await AIService.updateConfig({
      ...(enabled !== undefined && { enabled }),
      ...(provider !== undefined && { provider }),
      ...(apiKey !== undefined && { apiKey }),
      ...(model !== undefined && { model }),
    });

    // 監査ログに記録
    await AuditService.log({
      action: "AI_CONFIG_UPDATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: {
        enabled,
        provider,
        model,
        apiKeyChanged: apiKey !== undefined,
      },
    }).catch(() => {});

    const config = await AIService.getConfig();

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : null,
        hasApiKey: !!config.apiKey,
      },
    });
  } catch (error) {
    console.error("Error updating AI config:", error);
    return NextResponse.json(
      { error: "Failed to update AI config" },
      { status: 500 }
    );
  }
}
