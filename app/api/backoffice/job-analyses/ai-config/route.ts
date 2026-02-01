import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";
import { testLocalConnection } from "@/lib/core-modules/ai/providers/local-provider";
import type { AIConfig } from "@/lib/core-modules/ai/types";
import { prisma } from "@/lib/prisma";

/**
 * AI業務分析専用のAI設定キー
 * デフォルトはアプリ全体のAI設定を使用
 * 値が設定されている場合のみオーバーライド
 */
const JOB_ANALYSIS_AI_KEYS = {
  PROVIDER: "job_analysis_ai_provider",
  API_KEY: "job_analysis_ai_api_key",
  MODEL: "job_analysis_ai_model",
  LOCAL_PROVIDER: "job_analysis_ai_local_provider",
  LOCAL_ENDPOINT: "job_analysis_ai_local_endpoint",
  LOCAL_MODEL: "job_analysis_ai_local_model",
  ENABLED: "job_analysis_ai_enabled", // "true" = 専用設定を有効化
} as const;

/**
 * GET /api/backoffice/job-analyses/ai-config
 * AI業務分析専用のAI設定を取得
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: Object.values(JOB_ANALYSIS_AI_KEYS) },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    return NextResponse.json({
      enabled: map.get(JOB_ANALYSIS_AI_KEYS.ENABLED) === "true",
      provider: map.get(JOB_ANALYSIS_AI_KEYS.PROVIDER) || "",
      apiKey: map.get(JOB_ANALYSIS_AI_KEYS.API_KEY) || "",
      model: map.get(JOB_ANALYSIS_AI_KEYS.MODEL) || "",
      localProvider: map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_PROVIDER) || "",
      localEndpoint: map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_ENDPOINT) || "",
      localModel: map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_MODEL) || "",
    });
  } catch (error) {
    console.error("Failed to fetch job analysis AI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/backoffice/job-analyses/ai-config
 * AI業務分析専用のAI設定を更新
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const keyValuePairs: { key: string; value: string }[] = [];

    if (body.enabled !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.ENABLED,
        value: body.enabled ? "true" : "false",
      });
    }
    if (body.provider !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.PROVIDER,
        value: body.provider,
      });
    }
    if (body.apiKey !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.API_KEY,
        value: body.apiKey,
      });
    }
    if (body.model !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.MODEL,
        value: body.model,
      });
    }
    if (body.localProvider !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.LOCAL_PROVIDER,
        value: body.localProvider,
      });
    }
    if (body.localEndpoint !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.LOCAL_ENDPOINT,
        value: body.localEndpoint,
      });
    }
    if (body.localModel !== undefined) {
      keyValuePairs.push({
        key: JOB_ANALYSIS_AI_KEYS.LOCAL_MODEL,
        value: body.localModel,
      });
    }

    // Upsert each setting
    for (const { key, value } of keyValuePairs) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update job analysis AI config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/backoffice/job-analyses/ai-config
 * AI業務分析専用AI設定のテスト接続
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.action !== "test-connection") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 専用設定を取得
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: Object.values(JOB_ANALYSIS_AI_KEYS) } },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));

    const enabled = map.get(JOB_ANALYSIS_AI_KEYS.ENABLED) === "true";
    if (!enabled) {
      return NextResponse.json({
        success: false,
        message: "Dedicated AI settings are not enabled",
      });
    }

    const provider = map.get(JOB_ANALYSIS_AI_KEYS.PROVIDER) || "local";

    if (provider === "local") {
      // ローカルLLMテスト: 専用設定をベースに、未設定ならアプリ全体設定をフォールバック
      const baseConfig = await AIService.getConfig();
      const localEndpoint =
        map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_ENDPOINT) ||
        baseConfig.localEndpoint;
      const localProvider =
        map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_PROVIDER) ||
        baseConfig.localProvider;
      const localModel =
        map.get(JOB_ANALYSIS_AI_KEYS.LOCAL_MODEL) || baseConfig.localModel;

      const testConfig: AIConfig = {
        ...baseConfig,
        provider: "local",
        localEndpoint,
        localProvider: localProvider as AIConfig["localProvider"],
        localModel,
      };
      const result = await testLocalConnection(testConfig);
      return NextResponse.json(result);
    }

    // クラウドプロバイダーテスト (OpenAI / Anthropic)
    const apiKey = map.get(JOB_ANALYSIS_AI_KEYS.API_KEY) || "";
    const model = map.get(JOB_ANALYSIS_AI_KEYS.MODEL) || "";

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API key is not configured",
      });
    }

    if (provider === "openai") {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: `OpenAI connected${model ? ` (model: ${model})` : ""}`,
          });
        }
        return NextResponse.json({
          success: false,
          message: `OpenAI API error: ${response.status}`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({
          success: false,
          message: `Connection failed: ${msg}`,
        });
      }
    }

    if (provider === "anthropic") {
      try {
        // Anthropic: messagesエンドポイントに最小リクエストを送信
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: model || "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "test" }],
          }),
        });
        if (response.ok || response.status === 200) {
          return NextResponse.json({
            success: true,
            message: `Anthropic connected${model ? ` (model: ${model})` : ""}`,
          });
        }
        // 401 = invalid key, 其他は接続はできている
        if (response.status === 401) {
          return NextResponse.json({
            success: false,
            message: "Invalid API key",
          });
        }
        return NextResponse.json({
          success: true,
          message: `Anthropic connected (status: ${response.status})`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({
          success: false,
          message: `Connection failed: ${msg}`,
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: `Unknown provider: ${provider}`,
    });
  } catch (error) {
    console.error("Failed to test connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 },
    );
  }
}
