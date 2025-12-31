import type { AppModule } from "@/types/module";

/**
 * 生成AIモジュール（コアモジュール）
 *
 * AIを活用した機能を提供します。
 * - 翻訳（日本語↔英語）
 * - 将来: ローカルLLM対応
 *
 * 設定はシステム環境の「AI設定」タブで管理します。
 */
export const aiModule: AppModule = {
  id: "ai",
  name: "Generative AI",
  nameJa: "生成AI",
  description: "AI-powered features including translation",
  descriptionJa: "翻訳などのAI機能を提供します",
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
  menus: [], // サイドバーメニューなし（管理画面のタブで設定）
  // 将来的にサービスメニューを追加可能
  // services: [
  //   { id: "translate", name: "Translation", nameJa: "翻訳" },
  // ],
};
