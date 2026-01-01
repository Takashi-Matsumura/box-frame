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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
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
  ],
};
