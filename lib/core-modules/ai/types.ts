/**
 * 生成AIモジュール 型定義
 *
 * AIサービスで使用する共通の型定義を集約
 */

// ============================================
// プロバイダの型
// ============================================

/**
 * AIプロバイダの種類
 */
export type AIProvider = "openai" | "anthropic" | "local";

/**
 * ローカルLLMプロバイダの種類
 */
export type LocalLLMProvider = "llama.cpp" | "lm-studio" | "ollama";

// ============================================
// 設定の型
// ============================================

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

// ============================================
// メッセージの型
// ============================================

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ============================================
// リクエスト/レスポンスの型
// ============================================

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
  /** 温度パラメータ（0-2、低いほど決定的） */
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
 * データ抽出レスポンス
 */
export interface ExtractResponse {
  data: Record<string, unknown>;
  provider: AIProvider;
  model: string;
}

// ============================================
// 接続テストの型
// ============================================

/**
 * 接続テスト結果
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

// ============================================
// トークン関連の型
// ============================================

/**
 * コンテキスト使用状況
 */
export interface ContextUsage {
  used: number;
  total: number;
  percentage: number;
  remaining: number;
}
