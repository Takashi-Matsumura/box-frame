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
export const LOCAL_LLM_DEFAULTS: Record<
  LocalLLMProvider,
  { endpoint: string; model: string }
> = {
  "llama.cpp": {
    endpoint: "http://localhost:8080/v1/chat/completions",
    model: "default",
  },
  "lm-studio": {
    endpoint: "http://localhost:1234/v1/chat/completions",
    model: "default",
  },
  ollama: {
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
 * チャットメッセージ
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * チャットリクエスト
 */
export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
}

/**
 * チャットレスポンス
 */
export interface ChatResponse {
  message: string;
  provider: AIProvider;
  model: string;
}

/**
 * 汎用生成リクエスト（外部モジュール向けAPI）
 */
export interface GenerateRequest {
  /** ユーザー入力テキスト */
  input: string;
  /** システムプロンプト（AIの役割・指示） */
  systemPrompt: string;
  /** 温度パラメータ（0-1、低いほど決定的） */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
}

/**
 * 汎用生成レスポンス
 */
export interface GenerateResponse {
  output: string;
  provider: AIProvider;
  model: string;
}

/**
 * 要約リクエスト
 */
export interface SummarizeRequest {
  /** 要約対象テキスト */
  text: string;
  /** 要約の長さ */
  length?: "short" | "medium" | "long";
  /** 出力言語（デフォルトは入力と同じ） */
  language?: "ja" | "en";
}

/**
 * 要約レスポンス
 */
export interface SummarizeResponse {
  summary: string;
  provider: AIProvider;
  model: string;
}

/**
 * データ抽出リクエスト
 */
export interface ExtractRequest {
  /** 抽出対象テキスト */
  text: string;
  /** 抽出するフィールド定義 */
  schema: ExtractField[];
  /** 出力言語（デフォルトは入力と同じ） */
  language?: "ja" | "en";
}

/**
 * 抽出フィールド定義
 */
export interface ExtractField {
  /** フィールド名 */
  name: string;
  /** フィールドの説明（AIへの指示） */
  description: string;
  /** フィールドの型 */
  type: "string" | "number" | "boolean" | "array";
  /** 必須かどうか */
  required?: boolean;
}

/**
 * データ抽出レスポンス
 */
export interface ExtractResponse {
  data: Record<string, unknown>;
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

    const localProvider =
      (settingsMap.get(AI_SETTINGS.LOCAL_PROVIDER) as LocalLLMProvider) ||
      "llama.cpp";

    return {
      enabled: settingsMap.get(AI_SETTINGS.ENABLED) === "true",
      provider:
        (settingsMap.get(AI_SETTINGS.PROVIDER) as AIProvider) || "local",
      apiKey: settingsMap.get(AI_SETTINGS.API_KEY) || null,
      model: settingsMap.get(AI_SETTINGS.MODEL) || "gpt-4o-mini",
      localProvider,
      localEndpoint:
        settingsMap.get(AI_SETTINGS.LOCAL_ENDPOINT) ||
        LOCAL_LLM_DEFAULTS[localProvider].endpoint,
      localModel:
        settingsMap.get(AI_SETTINGS.LOCAL_MODEL) ||
        LOCAL_LLM_DEFAULTS[localProvider].model,
    };
  }

  /**
   * AI設定を更新
   */
  static async updateConfig(config: Partial<AIConfig>): Promise<void> {
    const updates: { key: string; value: string }[] = [];

    if (config.enabled !== undefined) {
      updates.push({
        key: AI_SETTINGS.ENABLED,
        value: config.enabled.toString(),
      });
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
      updates.push({
        key: AI_SETTINGS.LOCAL_PROVIDER,
        value: config.localProvider,
      });
    }
    if (config.localEndpoint !== undefined) {
      updates.push({
        key: AI_SETTINGS.LOCAL_ENDPOINT,
        value: config.localEndpoint,
      });
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
    const config = await AIService.getConfig();

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
  static async testLocalConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    const config = await AIService.getConfig();

    if (config.provider !== "local") {
      return {
        success: false,
        message: "Local LLM is not selected as provider",
      };
    }

    try {
      // 簡単なテストリクエスト
      if (config.localProvider === "ollama") {
        const response = await fetch(
          config.localEndpoint.replace("/api/chat", "/api/tags"),
          {
            method: "GET",
          },
        );
        if (response.ok) {
          return { success: true, message: "Ollama is running" };
        }
      } else {
        // OpenAI互換API (llama.cpp, LM Studio)
        const response = await fetch(
          config.localEndpoint.replace("/v1/chat/completions", "/v1/models"),
          {
            method: "GET",
          },
        );
        if (response.ok) {
          return {
            success: true,
            message: `${config.localProvider} is running`,
          };
        }
      }
      return {
        success: false,
        message: "Server responded but health check failed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  /**
   * ローカルLLMの実際のモデル名を取得
   */
  static async getLocalModelName(): Promise<string | null> {
    const config = await AIService.getConfig();

    if (config.provider !== "local") {
      return null;
    }

    try {
      if (config.localProvider === "ollama") {
        // Ollamaは設定されたモデル名をそのまま返す
        return config.localModel;
      } else {
        // OpenAI互換API (llama.cpp, LM Studio) - /v1/models から取得
        const response = await fetch(
          config.localEndpoint.replace("/v1/chat/completions", "/v1/models"),
          { method: "GET" },
        );
        if (response.ok) {
          const data = await response.json();
          // llama.cpp: data.data[0].id にモデル名が入っている
          if (data.data && data.data.length > 0) {
            const rawModelName = data.data[0].id;
            return AIService.parseModelName(rawModelName);
          }
        }
      }
    } catch {
      // エラー時は null を返す
    }
    return null;
  }

  /**
   * モデル名をパースして短い表示名を取得
   * 例: "/Users/.../bartowski_google_gemma-3n-E4B-it-GGUF_google_gemma-3n-E4B-it-Q6_K.gguf"
   *   → "gemma-3n-E4B-it-Q6_K"
   */
  private static parseModelName(rawName: string): string {
    // パスから最後の部分（ファイル名）を取得
    let name = rawName.split("/").pop() || rawName;

    // .gguf 拡張子を除去
    name = name.replace(/\.gguf$/i, "");

    // よくあるパターンを処理
    // bartowski_google_gemma-3n-E4B-it-GGUF_google_gemma-3n-E4B-it-Q6_K
    // → 後半部分（実際のモデル名+量子化）を抽出

    // "_GGUF_" で分割して後半を取得
    if (name.includes("_GGUF_")) {
      name = name.split("_GGUF_").pop() || name;
    }

    // "GGUF_" で始まる場合も処理
    if (name.startsWith("GGUF_")) {
      name = name.substring(5);
    }

    // プレフィックス（bartowski_, TheBloke_ など）を除去
    const prefixPatterns = [
      /^bartowski_/i,
      /^thebloke_/i,
      /^lmstudio-community_/i,
      /^huggingface_/i,
    ];
    for (const pattern of prefixPatterns) {
      name = name.replace(pattern, "");
    }

    // google_ などのベンダープレフィックスを除去（モデル名自体に含まれている場合）
    name = name.replace(/^google_/i, "");
    name = name.replace(/^meta_/i, "");
    name = name.replace(/^mistral_/i, "");

    return name;
  }

  /**
   * テキストを翻訳
   */
  static async translate(
    request: TranslateRequest,
  ): Promise<TranslateResponse> {
    const config = await AIService.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.translateWithOpenAI(request, config);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.translateWithAnthropic(request, config);
      case "local":
        return AIService.translateWithLocal(request, config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * OpenAI APIで翻訳
   */
  private static async translateWithOpenAI(
    request: TranslateRequest,
    config: AIConfig,
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
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`,
      );
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
    config: AIConfig,
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
      throw new Error(
        error.error?.message || `Anthropic API error: ${response.status}`,
      );
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
    config: AIConfig,
  ): Promise<TranslateResponse> {
    const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
    const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

    if (config.localProvider === "ollama") {
      return AIService.translateWithOllama(
        request,
        config,
        sourceLang,
        targetLang,
      );
    } else {
      // llama.cpp と LM Studio は OpenAI互換API
      return AIService.translateWithOpenAICompatible(
        request,
        config,
        sourceLang,
        targetLang,
      );
    }
  }

  /**
   * OpenAI互換APIで翻訳 (llama.cpp, LM Studio)
   */
  private static async translateWithOpenAICompatible(
    request: TranslateRequest,
    config: AIConfig,
    sourceLang: string,
    targetLang: string,
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
    targetLang: string,
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

  /**
   * チャット
   */
  static async chat(request: ChatRequest): Promise<ChatResponse> {
    const config = await AIService.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    // デフォルトのシステムプロンプト
    const defaultSystemPrompt =
      "You are a helpful AI assistant. Be concise and helpful in your responses. Respond in the same language as the user's message.";
    const systemPrompt = request.systemPrompt || defaultSystemPrompt;

    // システムプロンプトをメッセージの先頭に追加
    const messagesWithSystem: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...request.messages.filter((m) => m.role !== "system"),
    ];

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.chatWithOpenAI(messagesWithSystem, config);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.chatWithAnthropic(messagesWithSystem, config);
      case "local":
        return AIService.chatWithLocal(messagesWithSystem, config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * OpenAI APIでチャット
   */
  private static async chatWithOpenAI(
    messages: ChatMessage[],
    config: AIConfig,
  ): Promise<ChatResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error("No response received from OpenAI");
    }

    return {
      message,
      provider: "openai",
      model: config.model,
    };
  }

  /**
   * Anthropic APIでチャット
   */
  private static async chatWithAnthropic(
    messages: ChatMessage[],
    config: AIConfig,
  ): Promise<ChatResponse> {
    // Anthropicはsystemをmessagesから分離する必要がある
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-haiku-20240307",
        max_tokens: 2000,
        system: systemMessage?.content,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Anthropic API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const message = data.content?.[0]?.text?.trim();

    if (!message) {
      throw new Error("No response received from Anthropic");
    }

    return {
      message,
      provider: "anthropic",
      model: config.model,
    };
  }

  /**
   * ローカルLLMでチャット
   */
  private static async chatWithLocal(
    messages: ChatMessage[],
    config: AIConfig,
  ): Promise<ChatResponse> {
    if (config.localProvider === "ollama") {
      return AIService.chatWithOllama(messages, config);
    } else {
      // llama.cpp と LM Studio は OpenAI互換API
      return AIService.chatWithOpenAICompatible(messages, config);
    }
  }

  /**
   * OpenAI互換APIでチャット (llama.cpp, LM Studio)
   */
  private static async chatWithOpenAICompatible(
    messages: ChatMessage[],
    config: AIConfig,
  ): Promise<ChatResponse> {
    const response = await fetch(config.localEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.localModel || "default",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Local LLM error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error(`No response received from ${config.localProvider}`);
    }

    return {
      message,
      provider: "local",
      model: `${config.localProvider}/${config.localModel}`,
    };
  }

  /**
   * Ollama APIでチャット
   */
  private static async chatWithOllama(
    messages: ChatMessage[],
    config: AIConfig,
  ): Promise<ChatResponse> {
    const response = await fetch(config.localEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.localModel || "llama3.2",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const message = data.message?.content?.trim();

    if (!message) {
      throw new Error("No response received from Ollama");
    }

    return {
      message,
      provider: "local",
      model: `ollama/${config.localModel}`,
    };
  }

  // ============================================
  // 外部モジュール向けAPIサービス
  // ============================================

  /**
   * 汎用テキスト生成（外部モジュール向け）
   *
   * カスタムプロンプトを使用してテキストを生成します。
   * 他のモジュールから呼び出して、様々なAIタスクに利用できます。
   *
   * @example
   * ```typescript
   * const result = await AIService.generate({
   *   input: "売上データ: 1月100万円、2月150万円、3月120万円",
   *   systemPrompt: "あなたはビジネスアナリストです。データを分析してください。",
   *   temperature: 0.5,
   * });
   * ```
   */
  static async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const config = await AIService.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    const messages: ChatMessage[] = [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.input },
    ];

    const temperature = request.temperature ?? 0.7;
    const maxTokens = request.maxTokens ?? 2000;

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.generateWithOpenAI(
          messages,
          config,
          temperature,
          maxTokens,
        );
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return AIService.generateWithAnthropic(
          messages,
          config,
          temperature,
          maxTokens,
        );
      case "local":
        return AIService.generateWithLocal(
          messages,
          config,
          temperature,
          maxTokens,
        );
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * OpenAI APIで汎用生成
   */
  private static async generateWithOpenAI(
    messages: ChatMessage[],
    config: AIConfig,
    temperature: number,
    maxTokens: number,
  ): Promise<GenerateResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content?.trim();

    if (!output) {
      throw new Error("No response received from OpenAI");
    }

    return {
      output,
      provider: "openai",
      model: config.model,
    };
  }

  /**
   * Anthropic APIで汎用生成
   */
  private static async generateWithAnthropic(
    messages: ChatMessage[],
    config: AIConfig,
    temperature: number,
    maxTokens: number,
  ): Promise<GenerateResponse> {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-haiku-20240307",
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Anthropic API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const output = data.content?.[0]?.text?.trim();

    if (!output) {
      throw new Error("No response received from Anthropic");
    }

    return {
      output,
      provider: "anthropic",
      model: config.model,
    };
  }

  /**
   * ローカルLLMで汎用生成
   */
  private static async generateWithLocal(
    messages: ChatMessage[],
    config: AIConfig,
    temperature: number,
    maxTokens: number,
  ): Promise<GenerateResponse> {
    if (config.localProvider === "ollama") {
      const response = await fetch(config.localEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.localModel || "llama3.2",
          messages,
          stream: false,
          options: { temperature },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const output = data.message?.content?.trim();

      if (!output) {
        throw new Error("No response received from Ollama");
      }

      return {
        output,
        provider: "local",
        model: `ollama/${config.localModel}`,
      };
    }

    // llama.cpp, LM Studio (OpenAI互換)
    const response = await fetch(config.localEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "default",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Local LLM error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content?.trim();

    if (!output) {
      throw new Error(`No response received from ${config.localProvider}`);
    }

    return {
      output,
      provider: "local",
      model: `${config.localProvider}/${config.localModel}`,
    };
  }

  /**
   * テキスト要約（外部モジュール向け）
   *
   * @example
   * ```typescript
   * const result = await AIService.summarize({
   *   text: "長い議事録テキスト...",
   *   length: "short",
   *   language: "ja",
   * });
   * ```
   */
  static async summarize(
    request: SummarizeRequest,
  ): Promise<SummarizeResponse> {
    const lengthInstructions = {
      short: "1-2 sentences",
      medium: "3-5 sentences",
      long: "1-2 paragraphs",
    };

    const lengthInstruction = lengthInstructions[request.length || "medium"];
    const langInstruction =
      request.language === "ja"
        ? "日本語で出力してください。"
        : request.language === "en"
          ? "Output in English."
          : "Output in the same language as the input.";

    const systemPrompt = `You are a professional summarizer. Summarize the given text concisely in ${lengthInstruction}. ${langInstruction} Only output the summary, nothing else.`;

    const result = await AIService.generate({
      input: request.text,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1000,
    });

    return {
      summary: result.output,
      provider: result.provider,
      model: result.model,
    };
  }

  /**
   * データ抽出（外部モジュール向け）
   *
   * テキストから構造化データを抽出します。
   *
   * @example
   * ```typescript
   * const result = await AIService.extract({
   *   text: "田中太郎さん（35歳）は東京都在住で、エンジニアとして働いています。",
   *   schema: [
   *     { name: "name", description: "人物の名前", type: "string", required: true },
   *     { name: "age", description: "年齢", type: "number" },
   *     { name: "location", description: "居住地", type: "string" },
   *     { name: "occupation", description: "職業", type: "string" },
   *   ],
   * });
   * // result.data = { name: "田中太郎", age: 35, location: "東京都", occupation: "エンジニア" }
   * ```
   */
  static async extract(request: ExtractRequest): Promise<ExtractResponse> {
    const schemaDescription = request.schema
      .map((field) => {
        const requiredMark = field.required ? " (required)" : "";
        return `- ${field.name}: ${field.description} (type: ${field.type})${requiredMark}`;
      })
      .join("\n");

    const langInstruction =
      request.language === "ja"
        ? "フィールド値は日本語で出力してください。"
        : request.language === "en"
          ? "Output field values in English."
          : "";

    const systemPrompt = `You are a data extraction assistant. Extract the following fields from the given text and return them as a JSON object. ${langInstruction}

Fields to extract:
${schemaDescription}

Rules:
- Output ONLY valid JSON, no explanation or markdown
- Use null for fields that cannot be found in the text
- For array fields, return an array of values
- For number fields, return numbers without units
- For boolean fields, return true or false`;

    const result = await AIService.generate({
      input: request.text,
      systemPrompt,
      temperature: 0.1,
      maxTokens: 1000,
    });

    // JSONをパース
    let data: Record<string, unknown>;
    try {
      // マークダウンコードブロックを除去
      let jsonStr = result.output;
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      data = JSON.parse(jsonStr.trim());
    } catch {
      throw new Error(
        `Failed to parse extraction result as JSON: ${result.output}`,
      );
    }

    return {
      data,
      provider: result.provider,
      model: result.model,
    };
  }
}
