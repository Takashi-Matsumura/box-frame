/**
 * テンプレートページの翻訳定義
 *
 * 新しいページを作成する際は、このファイルをコピーして
 * 各ページ固有の翻訳を追加してください。
 */
export const templateTranslations = {
  en: {
    title: "Template",
    pageTitle: "Template Page",
    description: "This is a template page for creating custom modules.",
    welcomeMessage: "Welcome to the Template Module!",
    features: "Features",
    featureList: [
      "Multi-language support (English / Japanese)",
      "Role-based access control",
      "Responsive design",
      "Dark mode support",
    ],
    gettingStarted: "Getting Started",
    gettingStartedText:
      "Copy this page and customize it for your own module. Check the documentation in docs/MODULE_GUIDE.md for more details.",
    sampleCard: "Sample Card",
    sampleCardContent:
      "This is a sample card component. You can use the Card component from @/components/ui/card.",
  },
  ja: {
    title: "テンプレート",
    pageTitle: "テンプレートページ",
    description: "カスタムモジュールを作成するためのテンプレートページです。",
    welcomeMessage: "テンプレートモジュールへようこそ！",
    features: "機能",
    featureList: [
      "多言語対応（英語・日本語）",
      "ロールベースのアクセス制御",
      "レスポンシブデザイン",
      "ダークモード対応",
    ],
    gettingStarted: "はじめに",
    gettingStartedText:
      "このページをコピーして、独自のモジュール用にカスタマイズしてください。詳細は docs/MODULE_GUIDE.md のドキュメントを参照してください。",
    sampleCard: "サンプルカード",
    sampleCardContent:
      "これはサンプルのカードコンポーネントです。@/components/ui/card の Card コンポーネントを使用できます。",
  },
} as const;

export type TemplateTranslationKey = keyof typeof templateTranslations.en;
