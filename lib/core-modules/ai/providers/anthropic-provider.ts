/**
 * Anthropic プロバイダ
 *
 * Anthropic API を使用したAI機能の実装
 */

import {
  ANTHROPIC_API_VERSION,
  API_ENDPOINTS,
  DEFAULT_MODELS,
} from "../constants";
import type {
  AIConfig,
  ChatMessage,
  ChatResponse,
  GenerateResponse,
  TranslateRequest,
  TranslateResponse,
} from "../types";

/**
 * Anthropic APIで翻訳
 */
export async function translateWithAnthropic(
  request: TranslateRequest,
  config: AIConfig,
): Promise<TranslateResponse> {
  const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
  const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

  const response = await fetch(API_ENDPOINTS.ANTHROPIC_MESSAGES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.anthropic,
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
 * Anthropic APIでチャット
 */
export async function chatWithAnthropic(
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

  const response = await fetch(API_ENDPOINTS.ANTHROPIC_MESSAGES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.anthropic,
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
 * Anthropic APIで汎用生成
 */
export async function generateWithAnthropic(
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

  const response = await fetch(API_ENDPOINTS.ANTHROPIC_MESSAGES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.anthropic,
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
