export const aiAnalyticsTranslations = {
  en: {
    title: "AI Business Analysis",
    description: "AI-powered job description generation and editing",
    welcomeTitle: "AI Business Analysis",
    welcomeMessage:
      "Generate and edit job descriptions with AI support. Paste reference materials and let AI create a draft.",
    // List
    analysisList: "Job Analyses",
    newAnalysis: "New Analysis",
    noAnalyses: "No job analyses yet",
    noAnalysesDescription:
      "Create your first AI-powered job analysis to get started.",
    // Card
    draft: "Draft",
    generating: "Generating",
    editing: "Editing",
    completed: "Completed",
    version: "Version",
    lastUpdated: "Last updated",
    // Create dialog
    createAnalysis: "Create Job Analysis",
    analysisTitle: "Title",
    analysisTitlePlaceholder: "Enter job title (e.g., Sales Order Processing)",
    analysisDescription: "Description",
    analysisDescriptionPlaceholder: "Enter description (optional)",
    inputMaterials: "Reference Materials",
    inputMaterialsPlaceholder:
      "Paste reference materials here (existing documents, notes, etc.). AI will use these to generate a more accurate job description.",
    analysisTags: "Tags",
    analysisTagsPlaceholder: "Enter tags separated by commas",
    cancel: "Cancel",
    create: "Create",
    creating: "Creating...",
    // Actions
    openDetail: "Details",
    edit: "Edit",
    delete: "Delete",
    // Status descriptions
    statusDescriptions: {
      draft: "Initial state, AI generation not started",
      generating: "AI is generating the job description",
      editing: "Editing the generated job description",
      completed: "Job description is finalized",
    },
    // Feature cards
    featureCards: {
      generate: {
        title: "AI Generation",
        description:
          "Automatically generate job descriptions from reference materials",
      },
      edit: {
        title: "Smart Editing",
        description:
          "Edit with AI support - format, review, and improve content",
      },
      manage: {
        title: "Version Management",
        description: "Track and manage all your job descriptions",
      },
    },
  },
  ja: {
    title: "AI業務分析",
    description: "AIによる業務分掌の自動生成・編集",
    welcomeTitle: "AI業務分析",
    welcomeMessage:
      "AIを活用して業務分掌を生成・編集します。参考資料を貼り付けて、AIにドラフトを作成させましょう。",
    // List
    analysisList: "業務分析一覧",
    newAnalysis: "新規作成",
    noAnalyses: "業務分析がありません",
    noAnalysesDescription:
      "最初のAI業務分析を作成して、業務分掌の文書化を始めましょう。",
    // Card
    draft: "下書き",
    generating: "生成中",
    editing: "編集中",
    completed: "完成",
    version: "バージョン",
    lastUpdated: "最終更新",
    // Create dialog
    createAnalysis: "業務分析を作成",
    analysisTitle: "タイトル",
    analysisTitlePlaceholder: "業務名を入力（例：受注処理業務）",
    analysisDescription: "説明",
    analysisDescriptionPlaceholder: "説明を入力（任意）",
    inputMaterials: "参考資料",
    inputMaterialsPlaceholder:
      "参考資料をここに貼り付けてください（既存の文書、メモなど）。AIがこれを元により正確な業務分掌を生成します。",
    analysisTags: "タグ",
    analysisTagsPlaceholder: "カンマ区切りでタグを入力",
    cancel: "キャンセル",
    create: "作成",
    creating: "作成中...",
    // Actions
    openDetail: "詳細",
    edit: "編集",
    delete: "削除",
    // Status descriptions
    statusDescriptions: {
      draft: "初期状態、AI生成未実施",
      generating: "AIが業務分掌を生成中",
      editing: "生成された業務分掌を編集中",
      completed: "業務分掌が完成",
    },
    // Feature cards
    featureCards: {
      generate: {
        title: "AI自動生成",
        description: "参考資料から業務分掌を自動生成",
      },
      edit: {
        title: "スマート編集",
        description: "AIサポート付きで編集・整形・改善",
      },
      manage: {
        title: "バージョン管理",
        description: "すべての業務分掌を追跡・管理",
      },
    },
  },
} as const;

export type AiAnalyticsTranslations =
  (typeof aiAnalyticsTranslations)["en"];
