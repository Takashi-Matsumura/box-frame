/**
 * 生成AIモジュール
 *
 * AI機能の型定義、定数、サービスを提供
 */

// 定数
export {
  AI_SETTINGS,
  ANTHROPIC_API_VERSION,
  API_ENDPOINTS,
  CONTEXT_WINDOW_SIZES,
  DEFAULT_GENERATION_PARAMS,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_PROMPTS,
  LOCAL_LLM_DEFAULTS,
  SUMMARIZE_LENGTH_INSTRUCTIONS,
  TOKEN_ESTIMATION,
} from "./constants";
// モジュール定義
export { aiModule } from "./module";
// プロバイダ（高度な使用ケース向け）
export * from "./providers";

// サービス
export {
  AIService,
  calculateContextUsage,
  estimateMessagesTokens,
  estimateTokens,
  formatTokenCount,
  getContextWindowSize,
} from "./services";
// 型定義
export type {
  AIConfig,
  AIProvider,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ConnectionTestResult,
  ContextUsage,
  ExtractField,
  ExtractRequest,
  ExtractResponse,
  GenerateRequest,
  GenerateResponse,
  LocalLLMProvider,
  SummarizeRequest,
  SummarizeResponse,
  TranslateRequest,
  TranslateResponse,
} from "./types";
