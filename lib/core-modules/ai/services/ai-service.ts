/**
 * AIサービス
 *
 * 翻訳などのAI機能を提供します。
 * クラウドAPI（OpenAI、Anthropic）とローカルLLM（llama.cpp、LM Studio、Ollama）に対応。
 */

import { prisma } from "@/lib/prisma";
import {
  AI_SETTINGS,
  DEFAULT_GENERATION_PARAMS,
  DEFAULT_SYSTEM_PROMPTS,
  LOCAL_LLM_DEFAULTS,
  SUMMARIZE_LENGTH_INSTRUCTIONS,
} from "../constants";
import {
  chatWithAnthropic,
  generateWithAnthropic,
  translateWithAnthropic,
} from "../providers/anthropic-provider";
import {
  chatWithLocal,
  generateWithLocal,
  getLocalModelName,
  testLocalConnection,
  translateWithLocal,
} from "../providers/local-provider";
import {
  chatWithOpenAI,
  generateWithOpenAI,
  translateWithOpenAI,
} from "../providers/openai-provider";
import type {
  AIConfig,
  AIProvider,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ConnectionTestResult,
  ExtractRequest,
  ExtractResponse,
  GenerateRequest,
  GenerateResponse,
  LocalLLMProvider,
  SummarizeRequest,
  SummarizeResponse,
  TranslateRequest,
  TranslateResponse,
} from "../types";

/**
 * AIサービス
 */
export class AIService {
  // ============================================
  // 設定管理
  // ============================================

  /**
   * AI設定を取得
   */
  static async getConfig(): Promise<AIConfig> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: Object.values(AI_SETTINGS) },
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

    if (config.provider === "local") {
      return !!config.localEndpoint;
    }

    return !!config.apiKey;
  }

  /**
   * ローカルLLMの接続テスト
   */
  static async testLocalConnection(): Promise<ConnectionTestResult> {
    const config = await AIService.getConfig();
    return testLocalConnection(config);
  }

  /**
   * ローカルLLMの実際のモデル名を取得
   */
  static async getLocalModelName(): Promise<string | null> {
    const config = await AIService.getConfig();
    return getLocalModelName(config);
  }

  // ============================================
  // 翻訳
  // ============================================

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
        return translateWithOpenAI(request, config);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return translateWithAnthropic(request, config);
      case "local":
        return translateWithLocal(request, config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  // ============================================
  // チャット
  // ============================================

  /**
   * チャット
   */
  static async chat(request: ChatRequest): Promise<ChatResponse> {
    const config = await AIService.getConfig();

    if (!config.enabled) {
      throw new Error("AI is not enabled");
    }

    const systemPrompt = request.systemPrompt || DEFAULT_SYSTEM_PROMPTS.chat;
    const messagesWithSystem: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...request.messages.filter((m) => m.role !== "system"),
    ];

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return chatWithOpenAI(messagesWithSystem, config);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return chatWithAnthropic(messagesWithSystem, config);
      case "local":
        return chatWithLocal(messagesWithSystem, config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  // ============================================
  // 外部モジュール向けAPIサービス
  // ============================================

  /**
   * 汎用テキスト生成（外部モジュール向け）
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

    const temperature =
      request.temperature ?? DEFAULT_GENERATION_PARAMS.temperature;
    const maxTokens = request.maxTokens ?? DEFAULT_GENERATION_PARAMS.maxTokens;

    switch (config.provider) {
      case "openai":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return generateWithOpenAI(messages, config, temperature, maxTokens);
      case "anthropic":
        if (!config.apiKey) {
          throw new Error("API key is not configured");
        }
        return generateWithAnthropic(messages, config, temperature, maxTokens);
      case "local":
        return generateWithLocal(messages, config, temperature, maxTokens);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * テキスト要約（外部モジュール向け）
   */
  static async summarize(
    request: SummarizeRequest,
  ): Promise<SummarizeResponse> {
    const lengthInstruction =
      SUMMARIZE_LENGTH_INSTRUCTIONS[request.length || "medium"];
    const langInstruction =
      request.language === "ja"
        ? "日本語で出力してください。"
        : request.language === "en"
          ? "Output in English."
          : "Output in the same language as the input.";

    const systemPrompt = DEFAULT_SYSTEM_PROMPTS.summarize(
      lengthInstruction,
      langInstruction,
    );

    const result = await AIService.generate({
      input: request.text,
      systemPrompt,
      temperature: DEFAULT_GENERATION_PARAMS.summarizeTemperature,
      maxTokens: DEFAULT_GENERATION_PARAMS.summarizeMaxTokens,
    });

    return {
      summary: result.output,
      provider: result.provider,
      model: result.model,
    };
  }

  /**
   * データ抽出（外部モジュール向け）
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

    const systemPrompt = DEFAULT_SYSTEM_PROMPTS.extract(
      schemaDescription,
      langInstruction,
    );

    const result = await AIService.generate({
      input: request.text,
      systemPrompt,
      temperature: DEFAULT_GENERATION_PARAMS.extractTemperature,
      maxTokens: DEFAULT_GENERATION_PARAMS.extractMaxTokens,
    });

    // JSONをパース
    let data: Record<string, unknown>;
    try {
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
