/**
 * 生成AIモジュール プロバイダ層
 *
 * 全プロバイダを再エクスポート
 */

// OpenAI プロバイダ
export {
  translateWithOpenAI,
  chatWithOpenAI,
  generateWithOpenAI,
} from "./openai-provider";

// Anthropic プロバイダ
export {
  translateWithAnthropic,
  chatWithAnthropic,
  generateWithAnthropic,
} from "./anthropic-provider";

// ローカルLLM プロバイダ
export {
  testLocalConnection,
  getLocalModelName,
  translateWithLocal,
  chatWithLocal,
  generateWithLocal,
} from "./local-provider";
