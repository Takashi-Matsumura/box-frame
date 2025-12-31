import { prisma } from "@/lib/prisma";

/**
 * AI設定のキー
 */
const AI_SETTINGS = {
  API_KEY: "ai_api_key",
  PROVIDER: "ai_provider", // openai, anthropic, local
  MODEL: "ai_model",
  ENABLED: "ai_enabled",
} as const;

/**
 * AIプロバイダの種類
 */
export type AIProvider = "openai" | "anthropic" | "local";

/**
 * AI設定
 */
export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string | null;
  model: string;
}

/**
 * 翻訳リクエスト
 */
export interface TranslateRequest {
  text: string;
  sourceLanguage: "ja" | "en";
  targetLanguage: "ja" | "en";
}

/**
 * 翻訳レスポンス
 */
export interface TranslateResponse {
  translatedText: string;
  provider: AIProvider;
  model: string;
}

/**
 * AIサービス
 *
 * 翻訳などのAI機能を提供します。
 * 将来的にローカルLLM対応も予定。
 */
export class AIService {
  /**
   * AI設定を取得
   */
  static async getConfig(): Promise<AIConfig> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: Object.values(AI_SETTINGS),
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      enabled: settingsMap.get(AI_SETTINGS.ENABLED) === "true",
      provider: (settingsMap.get(AI_SETTINGS.PROVIDER) as AIProvider) || "openai",
      apiKey: settingsMap.get(AI_SETTINGS.API_KEY) || null,
      model: settingsMap.get(AI_SETTINGS.MODEL) || "gpt-4o-mini",
    };
  }

  /**
   * AI設定を更新
   */
  static async updateConfig(config: Partial<AIConfig>): Promise<void> {
    const updates: { key: string; value: string }[] = [];

    if (config.enabled !== undefined) {
      updates.push({ key: AI_SETTINGS.ENABLED, value: config.enabled.toString() });
    }
    if (config.provider !== undefined) {
      updates.push({ key: AI_SETTINGS.PROVIDER, value: config.provider });
    }
    if (config.apiKey !== undefined) {
      updates.push({ key: AI_SETTINGS.API_KEY, value: config.apiKey || "" });
    }
    if (config.model !== undefined) {
      updates.push({ key: AI_SETTINGS.MODEL, value: config.model });
    }

    for (const { key, value } of updates) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }

  /**
   * AIが利用可能かどうか
   */
  static async isAvailable(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled && !!config.apiKey;
  }

  /**
   * テキストを翻訳
   */
  static async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const config = await this.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    if (!config.apiKey) {
      throw new Error("API key is not configured");
    }

    switch (config.provider) {
      case "openai":
        return this.translateWithOpenAI(request, config);
      case "anthropic":
        return this.translateWithAnthropic(request, config);
      case "local":
        throw new Error("Local LLM is not yet supported");
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * OpenAI APIで翻訳
   */
  private static async translateWithOpenAI(
    request: TranslateRequest,
    config: AIConfig
  ): Promise<TranslateResponse> {
    const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
    const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following ${sourceLang} text to ${targetLang}. Only output the translated text, nothing else.`,
          },
          {
            role: "user",
            content: request.text,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error("No translation received from OpenAI");
    }

    return {
      translatedText,
      provider: "openai",
      model: config.model,
    };
  }

  /**
   * Anthropic APIで翻訳
   */
  private static async translateWithAnthropic(
    request: TranslateRequest,
    config: AIConfig
  ): Promise<TranslateResponse> {
    const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
    const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Translate the following ${sourceLang} text to ${targetLang}. Only output the translated text, nothing else.\n\n${request.text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.content?.[0]?.text?.trim();

    if (!translatedText) {
      throw new Error("No translation received from Anthropic");
    }

    return {
      translatedText,
      provider: "anthropic",
      model: config.model,
    };
  }
}
