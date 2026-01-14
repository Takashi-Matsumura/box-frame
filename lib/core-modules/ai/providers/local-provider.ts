/**
 * ローカルLLM プロバイダ
 *
 * llama.cpp、LM Studio、Ollama を使用したAI機能の実装
 */

import { DEFAULT_SYSTEM_PROMPTS } from "../constants";
import type {
  AIConfig,
  ChatMessage,
  ChatResponse,
  ConnectionTestResult,
  GenerateResponse,
  TranslateRequest,
  TranslateResponse,
} from "../types";

// ============================================
// 接続テスト
// ============================================

/**
 * ローカルLLMの接続テスト
 */
export async function testLocalConnection(
  config: AIConfig,
): Promise<ConnectionTestResult> {
  if (config.provider !== "local") {
    return {
      success: false,
      message: "Local LLM is not selected as provider",
    };
  }

  try {
    if (config.localProvider === "ollama") {
      const response = await fetch(
        config.localEndpoint.replace("/api/chat", "/api/tags"),
        { method: "GET" },
      );
      if (response.ok) {
        return { success: true, message: "Ollama is running" };
      }
    } else {
      // OpenAI互換API (llama.cpp, LM Studio)
      const response = await fetch(
        config.localEndpoint.replace("/v1/chat/completions", "/v1/models"),
        { method: "GET" },
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
export async function getLocalModelName(
  config: AIConfig,
): Promise<string | null> {
  if (config.provider !== "local") {
    return null;
  }

  try {
    if (config.localProvider === "ollama") {
      return config.localModel;
    } else {
      // OpenAI互換API (llama.cpp, LM Studio)
      const response = await fetch(
        config.localEndpoint.replace("/v1/chat/completions", "/v1/models"),
        { method: "GET" },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const rawModelName = data.data[0].id;
          return parseModelName(rawModelName);
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
 */
function parseModelName(rawName: string): string {
  let name = rawName.split("/").pop() || rawName;
  name = name.replace(/\.gguf$/i, "");

  if (name.includes("_GGUF_")) {
    name = name.split("_GGUF_").pop() || name;
  }
  if (name.startsWith("GGUF_")) {
    name = name.substring(5);
  }

  const prefixPatterns = [
    /^bartowski_/i,
    /^thebloke_/i,
    /^lmstudio-community_/i,
    /^huggingface_/i,
  ];
  for (const pattern of prefixPatterns) {
    name = name.replace(pattern, "");
  }

  name = name.replace(/^google_/i, "");
  name = name.replace(/^meta_/i, "");
  name = name.replace(/^mistral_/i, "");

  return name;
}

// ============================================
// 翻訳
// ============================================

/**
 * ローカルLLMで翻訳
 */
export async function translateWithLocal(
  request: TranslateRequest,
  config: AIConfig,
): Promise<TranslateResponse> {
  const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
  const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

  if (config.localProvider === "ollama") {
    return translateWithOllama(request, config, sourceLang, targetLang);
  } else {
    return translateWithOpenAICompatible(
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
async function translateWithOpenAICompatible(
  request: TranslateRequest,
  config: AIConfig,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.localModel || "default",
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
async function translateWithOllama(
  request: TranslateRequest,
  config: AIConfig,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.localModel || "llama3.2",
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

// ============================================
// チャット
// ============================================

/**
 * ローカルLLMでチャット
 */
export async function chatWithLocal(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  if (config.localProvider === "ollama") {
    return chatWithOllama(messages, config);
  } else {
    return chatWithOpenAICompatible(messages, config);
  }
}

/**
 * OpenAI互換APIでチャット (llama.cpp, LM Studio)
 */
async function chatWithOpenAICompatible(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
async function chatWithOllama(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
// 汎用生成
// ============================================

/**
 * ローカルLLMで汎用生成
 */
export async function generateWithLocal(
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
