/**
 * 生成AIモジュール
 *
 * AI機能の型定義、定数、サービスを提供
 */

// モジュール定義
export { aiModule } from "./module";

// 型定義
export type {
  AIProvider,
  LocalLLMProvider,
  AIConfig,
  ChatMessage,
  TranslateRequest,
  TranslateResponse,
  ChatRequest,
  ChatResponse,
  GenerateRequest,
  GenerateResponse,
  SummarizeRequest,
  SummarizeResponse,
  ExtractField,
  ExtractRequest,
  ExtractResponse,
  ConnectionTestResult,
  ContextUsage,
} from "./types";

// 定数
export {
  AI_SETTINGS,
  LOCAL_LLM_DEFAULTS,
  API_ENDPOINTS,
  ANTHROPIC_API_VERSION,
  DEFAULT_MODELS,
  DEFAULT_GENERATION_PARAMS,
  DEFAULT_SYSTEM_PROMPTS,
  SUMMARIZE_LENGTH_INSTRUCTIONS,
  CONTEXT_WINDOW_SIZES,
  TOKEN_ESTIMATION,
} from "./constants";

// サービス
export {
  AIService,
  estimateTokens,
  estimateMessagesTokens,
  getContextWindowSize,
  calculateContextUsage,
  formatTokenCount,
} from "./services";

// プロバイダ（高度な使用ケース向け）
export * from "./providers";
