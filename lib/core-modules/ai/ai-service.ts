import { prisma } from "@/lib/prisma";

/**
 * AI設定のキー
 */
const AI_SETTINGS = {
  API_KEY: "ai_api_key",
  PROVIDER: "ai_provider", // openai, anthropic, local
  MODEL: "ai_model",
  ENABLED: "ai_enabled",
  LOCAL_PROVIDER: "ai_local_provider", // llama.cpp, lm-studio, ollama
  LOCAL_ENDPOINT: "ai_local_endpoint",
  LOCAL_MODEL: "ai_local_model",
} as const;

/**
 * AIプロバイダの種類
 */
export type AIProvider = "openai" | "anthropic" | "local";

/**
 * ローカルLLMプロバイダの種類
 */
export type LocalLLMProvider = "llama.cpp" | "lm-studio" | "ollama";

/**
 * ローカルLLMのデフォルト設定
 */
export const LOCAL_LLM_DEFAULTS: Record<LocalLLMProvider, { endpoint: string; model: string }> = {
  "llama.cpp": {
    endpoint: "http://localhost:8080/v1/chat/completions",
    model: "default",
  },
  "lm-studio": {
    endpoint: "http://localhost:1234/v1/chat/completions",
    model: "default",
  },
  "ollama": {
    endpoint: "http://localhost:11434/api/chat",
    model: "llama3.2",
  },
};

/**
 * AI設定
 */
export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string | null;
  model: string;
  // ローカルLLM設定
  localProvider: LocalLLMProvider;
  localEndpoint: string;
  localModel: string;
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
 * クラウドAPI（OpenAI、Anthropic）とローカルLLM（llama.cpp、LM Studio、Ollama）に対応。
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

    const localProvider = (settingsMap.get(AI_SETTINGS.LOCAL_PROVIDER) as LocalLLMProvider) || "llama.cpp";

    return {
      enabled: settingsMap.get(AI_SETTINGS.ENABLED) === "true",
      provider: (settingsMap.get(AI_SETTINGS.PROVIDER) as AIProvider) || "local",
      apiKey: settingsMap.get(AI_SETTINGS.API_KEY) || null,
      model: settingsMap.get(AI_SETTINGS.MODEL) || "gpt-4o-mini",
      localProvider,
      localEndpoint: settingsMap.get(AI_SETTINGS.LOCAL_ENDPOINT) || LOCAL_LLM_DEFAULTS[localProvider].endpoint,
      localModel: settingsMap.get(AI_SETTINGS.LOCAL_MODEL) || LOCAL_LLM_DEFAULTS[localProvider].model,
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
    if (config.localProvider !== undefined) {
      updates.push({ key: AI_SETTINGS.LOCAL_PROVIDER, value: config.localProvider });
    }
    if (config.localEndpoint !== undefined) {
      updates.push({ key: AI_SETTINGS.LOCAL_ENDPOINT, value: config.localEndpoint });
    }
    if (config.localModel !== undefined) {
      updates.push({ key: AI_SETTINGS.LOCAL_MODEL, value: config.localModel });
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

    if (!config.enabled) {
      return false;
    }

    // ローカルLLMの場合はAPIキー不要
    if (config.provider === "local") {
      return !!config.localEndpoint;
    }

    // クラウドAPIの場合はAPIキーが必要
    return !!config.apiKey;
  }

  /**
   * ローカルLLMの接続テスト
   */
  static async testLocalConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig();

    if (config.provider !== "local") {
      return { success: false, message: "Local LLM is not selected as provider" };
    }

    try {
      // 簡単なテストリクエスト
      if (config.localProvider === "ollama") {
        const response = await fetch(config.localEndpoint.replace("/api/chat", "/api/tags"), {
          method: "GET",
        });
        if (response.ok) {
          return { success: true, message: "Ollama is running" };
        }
      } else {
        // OpenAI互換API (llama.cpp, LM Studio)
        const response = await fetch(config.localEndpoint.replace("/v1/chat/completions", "/v1/models"), {
          method: "GET",
        });
        if (response.ok) {
          return { success: true, message: `${config.localProvider} is running` };
        }
      }
      return { success: false, message: "Server responded but health check failed" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  /**
   * テキストを翻訳
   */
  static async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const config = await this.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return this.translateWithOpenAI(request, config);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return this.translateWithAnthropic(request, config);
      case "local":
        return this.translateWithLocal(request, config);
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

  /**
   * ローカルLLMで翻訳
   */
  private static async translateWithLocal(
    request: TranslateRequest,
    config: AIConfig
  ): Promise<TranslateResponse> {
    const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
    const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

    if (config.localProvider === "ollama") {
      return this.translateWithOllama(request, config, sourceLang, targetLang);
    } else {
      // llama.cpp と LM Studio は OpenAI互換API
      return this.translateWithOpenAICompatible(request, config, sourceLang, targetLang);
    }
  }

  /**
   * OpenAI互換APIで翻訳 (llama.cpp, LM Studio)
   */
  private static async translateWithOpenAICompatible(
    request: TranslateRequest,
    config: AIConfig,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslateResponse> {
    const response = await fetch(config.localEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.localModel || "default",
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
      const errorText = await response.text().catch(() => "");
      throw new Error(`Local LLM error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error(`No translation received from ${config.localProvider}`);
    }

    return {
      translatedText,
      provider: "local",
      model: `${config.localProvider}/${config.localModel}`,
    };
  }

  /**
   * Ollama APIで翻訳
   */
  private static async translateWithOllama(
    request: TranslateRequest,
    config: AIConfig,
    sourceLang: string,
    targetLang: string
  ): Promise<TranslateResponse> {
    const response = await fetch(config.localEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.localModel || "llama3.2",
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
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data.message?.content?.trim();

    if (!translatedText) {
      throw new Error("No translation received from Ollama");
    }

    return {
      translatedText,
      provider: "local",
      model: `ollama/${config.localModel}`,
    };
  }
}
