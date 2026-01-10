import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

/**
 * GET /api/ai/chat
 * AIチャットの利用可否とプロバイダ情報を取得
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const available = await AIService.isAvailable();
    const config = await AIService.getConfig();

    // プロバイダ名とモデル名を取得
    let providerName: string;
    let modelName: string;

    if (config.provider === "local") {
      providerName = config.localProvider;
      // ローカルLLMの場合、実際のモデル名を取得
      const actualModelName = await AIService.getLocalModelName();
      modelName = actualModelName || config.localModel;
    } else if (config.provider === "openai") {
      providerName = "OpenAI";
      modelName = config.model;
    } else if (config.provider === "anthropic") {
      providerName = "Anthropic";
      modelName = config.model;
    } else {
      providerName = config.provider;
      modelName = config.model;
    }

    return NextResponse.json({
      available,
      provider: config.provider,
      providerName,
      modelName,
    });
  } catch (error) {
    console.error("Error checking AI availability:", error);
    return NextResponse.json(
      { error: "Failed to check AI availability" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai/chat
 * AIチャットメッセージを送信
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 },
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: "Invalid message format" },
          { status: 400 },
        );
      }
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return NextResponse.json(
          { error: "Invalid message role" },
          { status: 400 },
        );
      }
    }

    const response = await AIService.chat({
      messages,
      systemPrompt,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI chat:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get AI response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
