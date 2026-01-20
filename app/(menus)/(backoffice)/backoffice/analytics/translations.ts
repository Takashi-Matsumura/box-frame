export const businessAnalyticsTranslations = {
  en: {
    title: "Business Analytics",
    description: "Business process analysis and documentation",
    welcomeTitle: "Business Process Analysis",
    welcomeMessage:
      "Manage and document your business processes with AI-powered hearing and flow diagram generation.",
    // Process list
    processList: "Business Processes",
    newProcess: "New Process",
    noProcesses: "No business processes yet",
    noProcessesDescription:
      "Create your first business process to start documenting workflows.",
    // Process card
    draft: "Draft",
    interview: "Interviewing",
    diagramming: "Diagramming",
    review: "Review",
    published: "Published",
    archived: "Archived",
    version: "Version",
    lastUpdated: "Last updated",
    // New process dialog
    createProcess: "Create Business Process",
    processTitle: "Title",
    processTitlePlaceholder: "Enter process title",
    processDescription: "Description",
    processDescriptionPlaceholder: "Enter process description (optional)",
    processTags: "Tags",
    processTagsPlaceholder: "Enter tags separated by commas",
    cancel: "Cancel",
    create: "Create",
    creating: "Creating...",
    // Actions
    startHearing: "Job Duties",
    viewDiagram: "View Diagram",
    workProcedures: "Procedures",
    edit: "Edit",
    delete: "Delete",
    // Status descriptions
    statusDescriptions: {
      draft: "Initial state, not yet started",
      interview: "AI hearing in progress",
      diagramming: "Creating flow diagram",
      review: "Under review",
      published: "Published and finalized",
      archived: "Archived for reference",
    },
    // Feature cards
    featureCards: {
      hearing: {
        title: "AI Hearing",
        description: "Document workflows through conversational AI interviews",
      },
      diagram: {
        title: "Flow Diagram",
        description:
          "Auto-generate draw.io diagrams from verbalized processes",
      },
      management: {
        title: "Process Management",
        description: "Track and manage all your business processes",
      },
    },
  },
  ja: {
    title: "業務分析",
    description: "業務プロセスの分析とドキュメント化",
    welcomeTitle: "業務プロセス分析",
    welcomeMessage:
      "AIを活用したヒアリングとフロー図自動生成で、業務プロセスを管理・文書化します。",
    // Process list
    processList: "業務プロセス",
    newProcess: "新規作成",
    noProcesses: "業務プロセスがありません",
    noProcessesDescription:
      "最初の業務プロセスを作成して、ワークフローの文書化を始めましょう。",
    // Process card
    draft: "下書き",
    interview: "ヒアリング中",
    diagramming: "フロー作成中",
    review: "レビュー中",
    published: "公開済み",
    archived: "アーカイブ",
    version: "バージョン",
    lastUpdated: "最終更新",
    // New process dialog
    createProcess: "業務プロセスを作成",
    processTitle: "タイトル",
    processTitlePlaceholder: "プロセス名を入力",
    processDescription: "説明",
    processDescriptionPlaceholder: "プロセスの説明を入力（任意）",
    processTags: "タグ",
    processTagsPlaceholder: "カンマ区切りでタグを入力",
    cancel: "キャンセル",
    create: "作成",
    creating: "作成中...",
    // Actions
    startHearing: "業務分掌",
    viewDiagram: "フロー図を表示",
    workProcedures: "作業手順書",
    edit: "編集",
    delete: "削除",
    // Status descriptions
    statusDescriptions: {
      draft: "初期状態、未着手",
      interview: "AIヒアリング進行中",
      diagramming: "フロー図作成中",
      review: "レビュー中",
      published: "公開済み・完了",
      archived: "参照用にアーカイブ",
    },
    // Feature cards
    featureCards: {
      hearing: {
        title: "AIヒアリング",
        description: "対話型AIインタビューでワークフローを文書化",
      },
      diagram: {
        title: "フロー図",
        description: "言語化されたプロセスからdraw.io図を自動生成",
      },
      management: {
        title: "プロセス管理",
        description: "すべての業務プロセスを追跡・管理",
      },
    },
  },
} as const;

export type BusinessAnalyticsTranslations =
  (typeof businessAnalyticsTranslations)["en"];
