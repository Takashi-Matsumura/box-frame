import type { AppModule } from "@/types/module";

/**
 * 生成AIモジュール（コアモジュール）
 *
 * AIを活用した機能を提供します。
 * - AIチャット
 * - 翻訳（日本語↔英語）
 * - ローカルLLM対応（llama.cpp, LM Studio, Ollama）
 *
 * 設定はシステム環境の「AI設定」タブで管理します。
 */
export const aiModule: AppModule = {
  id: "ai",
  name: "Generative AI",
  nameJa: "生成AI",
  description: "AI-powered features including chat and translation",
  descriptionJa: "AIチャットや翻訳などのAI機能を提供します",
  dependencies: [], // コアモジュール：依存なし
  icon: (
    <svg
      key="ai-icon"
      className="w-5 h-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        key="icon-path"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  ),
  enabled: true,
  order: 5, // システムモジュールより前
  menus: [
    {
      id: "ai-chat",
      moduleId: "ai",
      name: "AI Chat",
      nameJa: "AIチャット",
      path: "/ai-chat",
      icon: (
        <svg
          key="ai-chat-icon"
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            key="chat-icon-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      ),
      enabled: true,
      order: 15, // ダッシュボード(0)の後
      menuGroup: "user",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "translate",
      moduleId: "ai",
      name: "Translation",
      nameJa: "翻訳",
      description: "Translate text between Japanese and English",
      descriptionJa: "日本語と英語の翻訳",
      apiEndpoints: ["/api/ai/translate"],
      enabled: true,
    },
    {
      id: "generate",
      moduleId: "ai",
      name: "Text Generation",
      nameJa: "テキスト生成",
      description: "Generate text with custom prompts for various AI tasks",
      descriptionJa: "カスタムプロンプトによる汎用テキスト生成",
      apiEndpoints: ["/api/ai/services/generate"],
      enabled: true,
    },
    {
      id: "summarize",
      moduleId: "ai",
      name: "Summarization",
      nameJa: "要約",
      description: "Summarize long text into concise summaries",
      descriptionJa: "長文テキストの要約",
      apiEndpoints: ["/api/ai/services/summarize"],
      enabled: true,
    },
    {
      id: "extract",
      moduleId: "ai",
      name: "Data Extraction",
      nameJa: "データ抽出",
      description: "Extract structured data from unstructured text",
      descriptionJa: "テキストから構造化データを抽出",
      apiEndpoints: ["/api/ai/services/extract"],
      enabled: true,
    },
  ],
};
