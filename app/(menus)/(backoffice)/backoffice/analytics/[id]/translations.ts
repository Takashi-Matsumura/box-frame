export const processDetailTranslations = {
  en: {
    backToList: "Back to List",
    processDetail: "Process Detail",
    aiHearing: "AI Hearing",
    flowDiagram: "Flow Diagram",
    // Status
    status: "Status",
    draft: "Draft",
    interview: "Interviewing",
    diagramming: "Diagramming",
    review: "Review",
    published: "Published",
    archived: "Archived",
    // Process info
    description: "Description",
    noDescription: "No description",
    tags: "Tags",
    version: "Version",
    createdAt: "Created",
    updatedAt: "Last Updated",
    // AI Hearing
    startHearing: "Start AI Hearing",
    hearingDescription:
      "Let's document your business process through a conversation. I'll ask you questions about the workflow.",
    hearingInProgress: "Hearing in Progress",
    hearingComplete: "Hearing Complete",
    generateDiagram: "Generate Diagram",
    sendMessage: "Send",
    inputPlaceholder: "Type your message...",
    aiThinking: "AI is thinking...",
    restartHearing: "Restart",
    restartConfirm: "Are you sure you want to restart the hearing? All conversation history will be lost.",
    // Flow description
    flowDescription: "Flow Description",
    noFlowDescription: "No flow description yet. Complete the AI hearing first.",
    editFlowDescription: "Edit",
    saveFlowDescription: "Save",
    cancelEdit: "Cancel",
    // Diagram
    openDiagram: "Open Diagram Editor",
    diagramEditor: "Diagram Editor",
    saveDiagram: "Save Diagram",
    diagramSaved: "Diagram saved",
    noDiagram: "No diagram yet. Generate one from the flow description.",
    // Actions
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    delete: "Delete",
    // Status change
    changeStatus: "Change Status",
    statusUpdated: "Status updated",
  },
  ja: {
    backToList: "一覧に戻る",
    processDetail: "プロセス詳細",
    aiHearing: "AIヒアリング",
    flowDiagram: "フロー図",
    // Status
    status: "ステータス",
    draft: "下書き",
    interview: "ヒアリング中",
    diagramming: "フロー作成中",
    review: "レビュー中",
    published: "公開済み",
    archived: "アーカイブ",
    // Process info
    description: "説明",
    noDescription: "説明なし",
    tags: "タグ",
    version: "バージョン",
    createdAt: "作成日",
    updatedAt: "最終更新",
    // AI Hearing
    startHearing: "AIヒアリングを開始",
    hearingDescription:
      "対話を通じて業務プロセスを文書化しましょう。ワークフローについて質問していきます。",
    hearingInProgress: "ヒアリング進行中",
    hearingComplete: "ヒアリング完了",
    generateDiagram: "フロー図を生成",
    sendMessage: "送信",
    inputPlaceholder: "メッセージを入力...",
    aiThinking: "AIが考えています...",
    restartHearing: "やり直し",
    restartConfirm: "ヒアリングをやり直しますか？会話履歴はすべて削除されます。",
    // Flow description
    flowDescription: "フロー説明",
    noFlowDescription:
      "フロー説明がまだありません。まずAIヒアリングを完了してください。",
    editFlowDescription: "編集",
    saveFlowDescription: "保存",
    cancelEdit: "キャンセル",
    // Diagram
    openDiagram: "フロー図エディタを開く",
    diagramEditor: "フロー図エディタ",
    saveDiagram: "フロー図を保存",
    diagramSaved: "フロー図を保存しました",
    noDiagram:
      "フロー図がまだありません。フロー説明から生成してください。",
    // Actions
    save: "保存",
    saving: "保存中...",
    saved: "保存しました",
    delete: "削除",
    // Status change
    changeStatus: "ステータス変更",
    statusUpdated: "ステータスを更新しました",
  },
} as const;

export type ProcessDetailTranslations =
  (typeof processDetailTranslations)["en"];
