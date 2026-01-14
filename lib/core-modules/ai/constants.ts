/**
 * 生成AIモジュール 定数
 *
 * AIサービスで使用する定数を集約
 */

import type { LocalLLMProvider } from "./types";

// ============================================
// システム設定キー
// ============================================

/**
 * AI設定のキー（SystemSetting テーブル）
 */
export const AI_SETTINGS = {
  API_KEY: "ai_api_key",
  PROVIDER: "ai_provider",
  MODEL: "ai_model",
  ENABLED: "ai_enabled",
  LOCAL_PROVIDER: "ai_local_provider",
  LOCAL_ENDPOINT: "ai_local_endpoint",
  LOCAL_MODEL: "ai_local_model",
} as const;

// ============================================
// ローカルLLMデフォルト設定
// ============================================

/**
 * ローカルLLMプロバイダごとのデフォルト設定
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
} as const;

// ============================================
// APIエンドポイント
// ============================================

/**
 * クラウドAPI エンドポイント
 */
export const API_ENDPOINTS = {
  OPENAI_CHAT: "https://api.openai.com/v1/chat/completions",
  OPENAI_MODELS: "https://api.openai.com/v1/models",
  ANTHROPIC_MESSAGES: "https://api.anthropic.com/v1/messages",
} as const;

/**
 * Anthropic API バージョン
 */
export const ANTHROPIC_API_VERSION = "2023-06-01";

// ============================================
// デフォルトモデル
// ============================================

/**
 * プロバイダごとのデフォルトモデル
 */
export const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  local: "default",
} as const;

// ============================================
// 生成パラメータ
// ============================================

/**
 * デフォルトの生成パラメータ
 */
export const DEFAULT_GENERATION_PARAMS = {
  temperature: 0.7,
  maxTokens: 2000,
  translateTemperature: 0.3,
  translateMaxTokens: 1000,
  extractTemperature: 0.1,
  extractMaxTokens: 1000,
  summarizeTemperature: 0.3,
  summarizeMaxTokens: 1000,
} as const;

// ============================================
// システムプロンプト
// ============================================

/**
 * デフォルトのシステムプロンプト
 */
export const DEFAULT_SYSTEM_PROMPTS = {
  chat: "You are a helpful AI assistant. Be concise and helpful in your responses. Respond in the same language as the user's message.",
  translate: (sourceLang: string, targetLang: string) =>
    `You are a professional translator. Translate the following ${sourceLang} text to ${targetLang}. Only output the translated text, nothing else.`,
  summarize: (lengthInstruction: string, langInstruction: string) =>
    `You are a professional summarizer. Summarize the given text concisely in ${lengthInstruction}. ${langInstruction} Only output the summary, nothing else.`,
  extract: (schemaDescription: string, langInstruction: string) =>
    `You are a data extraction assistant. Extract the following fields from the given text and return them as a JSON object. ${langInstruction}

Fields to extract:
${schemaDescription}

Rules:
- Output ONLY valid JSON, no explanation or markdown
- Use null for fields that cannot be found in the text
- For array fields, return an array of values
- For number fields, return numbers without units
- For boolean fields, return true or false`,
} as const;

// ============================================
// 要約の長さ設定
// ============================================

/**
 * 要約の長さ指示
 */
export const SUMMARIZE_LENGTH_INSTRUCTIONS = {
  short: "1-2 sentences",
  medium: "3-5 sentences",
  long: "1-2 paragraphs",
} as const;

// ============================================
// コンテキストウィンドウサイズ
// ============================================

/**
 * モデルごとのコンテキストウィンドウサイズ
 */
export const CONTEXT_WINDOW_SIZES = {
  // OpenAI
  "gpt-4o": 128000,
  "gpt-4-turbo": 128000,
  "gpt-4-32k": 32768,
  "gpt-4": 8192,
  "gpt-3.5-turbo-16k": 16384,
  "gpt-3.5-turbo": 4096,
  // Anthropic
  "claude-3": 200000,
  "claude-2": 100000,
  // Local LLMs
  gemma: 8192,
  "llama-3.2": 128000,
  "llama-3.1": 128000,
  "llama-3": 8192,
  llama: 4096,
  mistral: 32768,
  phi: 4096,
  // Default
  default: 4096,
} as const;

// ============================================
// トークン推定係数
// ============================================

/**
 * トークン推定の係数
 */
export const TOKEN_ESTIMATION = {
  /** 日本語: 約1.5文字で1トークン */
  japaneseCharsPerToken: 1.5,
  /** 英語: 約4文字で1トークン */
  englishCharsPerToken: 4,
  /** メッセージのオーバーヘッド（role, 区切り等） */
  messageOverhead: 4,
  /** 全体のオーバーヘッド（開始/終了トークン等） */
  totalOverhead: 3,
} as const;
