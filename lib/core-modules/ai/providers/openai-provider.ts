/**
 * OpenAI プロバイダ
 *
 * OpenAI API を使用したAI機能の実装
 */

import type {
  AIConfig,
  ChatMessage,
  TranslateRequest,
  TranslateResponse,
  ChatResponse,
  GenerateResponse,
} from "../types";
import {
  API_ENDPOINTS,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_PROMPTS,
} from "../constants";

/**
 * OpenAI APIで翻訳
 */
export async function translateWithOpenAI(
  request: TranslateRequest,
  config: AIConfig
): Promise<TranslateResponse> {
  const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
  const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

  const response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.openai,
      messages: [
        {
          role: "system",
          content: DEFAULT_SYSTEM_PROMPTS.translate(sourceLang, targetLang),
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
      error.error?.message || `OpenAI API error: ${response.status}`
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
 * OpenAI APIでチャット
 */
export async function chatWithOpenAI(
  messages: ChatMessage[],
  config: AIConfig
): Promise<ChatResponse> {
  const response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.openai,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `OpenAI API error: ${response.status}`
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
 * OpenAI APIで汎用生成
 */
export async function generateWithOpenAI(
  messages: ChatMessage[],
  config: AIConfig,
  temperature: number,
  maxTokens: number
): Promise<GenerateResponse> {
  const response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODELS.openai,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `OpenAI API error: ${response.status}`
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
