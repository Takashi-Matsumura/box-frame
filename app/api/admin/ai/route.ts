import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService, LOCAL_LLM_DEFAULTS } from "@/lib/core-modules/ai";
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
      localLLMDefaults: LOCAL_LLM_DEFAULTS,
    });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI config" },
      { status: 500 },
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
    const {
      enabled,
      provider,
      apiKey,
      model,
      localProvider,
      localEndpoint,
      localModel,
    } = body;

    await AIService.updateConfig({
      ...(enabled !== undefined && { enabled }),
      ...(provider !== undefined && { provider }),
      ...(apiKey !== undefined && { apiKey }),
      ...(model !== undefined && { model }),
      ...(localProvider !== undefined && { localProvider }),
      ...(localEndpoint !== undefined && { localEndpoint }),
      ...(localModel !== undefined && { localModel }),
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
        localProvider,
        localEndpoint,
        localModel,
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
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/ai
 * ローカルLLM接続テスト（管理者のみ）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "test-connection") {
      const result = await AIService.testLocalConnection();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error testing AI connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 },
    );
  }
}
