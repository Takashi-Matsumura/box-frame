export const evaluationMasterTranslations = {
  en: {
    title: "Evaluation Master",

    // Tabs
    periods: "Periods",
    weights: "Weights",
    organizationGoals: "Organization Goals",
    customEvaluators: "Custom Evaluators",
    processCategories: "Process Categories",
    growthCategories: "Growth Categories",

    // Periods
    periodsTitle: "Evaluation Periods",
    periodsDescription: "Manage evaluation periods and their statuses",
    createPeriod: "Create Period",
    periodName: "Period Name",
    year: "Year",
    term: "Term",
    termH1: "First Half",
    termH2: "Second Half",
    termAnnual: "Annual",
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
    statusDraft: "Draft",
    statusActive: "Active",
    statusReview: "Review",
    statusClosed: "Closed",
    evaluationCount: "Evaluations",
    generateEvaluations: "Generate Evaluations",
    generateSuccess: "Evaluations generated successfully",
    changeStatus: "Change Status",
    confirmDelete: "Are you sure you want to delete this period?",
    noPeriods: "No evaluation periods found",

    // Weights
    weightsTitle: "Weight Settings",
    weightsDescription: "Configure evaluation weights by qualification grade",
    gradeCode: "Grade Code",
    resultsWeight: "Results",
    processWeight: "Process",
    growthWeight: "Growth",
    total: "Total",
    addWeight: "Add Weight",
    defaultWeight: "Default",
    weightError: "Total must be 100%",

    // Organization Goals
    goalsTitle: "Organization Goals",
    goalsDescription: "Set target and actual values for each organization",
    organizationType: "Type",
    organizationName: "Organization",
    targetProfit: "Target",
    actualProfit: "Actual",
    achievementRate: "Achievement Rate",
    syncScores: "Sync to Evaluations",
    syncSuccess: "Scores synced successfully",
    typeDepartment: "Department",
    typeSection: "Section",
    typeCourse: "Course",

    // Custom Evaluators
    customEvaluatorsTitle: "Custom Evaluators",
    customEvaluatorsDescription: "Override default evaluator assignments",
    employee: "Employee",
    evaluator: "Evaluator",
    effectiveFrom: "Effective From",
    effectiveTo: "Effective To",
    allPeriods: "All Periods",
    addCustomEvaluator: "Add Custom Evaluator",
    selectEmployee: "Select Employee",
    selectEvaluator: "Select Evaluator",

    // Process Categories
    processCategoriesTitle: "Process Evaluation Categories",
    processCategoriesDescription: "Define behavioral assessment criteria",
    categoryName: "Category Name",
    categoryNameEn: "Name (English)",
    description: "Description",
    sortOrder: "Order",
    isActive: "Active",
    addCategory: "Add Category",

    // Growth Categories
    growthCategoriesTitle: "Growth Evaluation Categories",
    growthCategoriesDescription: "Define growth assessment criteria with coefficients",
    coefficient: "Coefficient",

    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading...",
    noData: "No data",
    actions: "Actions",
    selectPeriod: "Select Period",
    refresh: "Refresh",
  },
  ja: {
    title: "評価マスタ",

    // Tabs
    periods: "評価期間",
    weights: "重み設定",
    organizationGoals: "組織目標",
    customEvaluators: "カスタム評価者",
    processCategories: "プロセス評価項目",
    growthCategories: "成長カテゴリ",

    // Periods
    periodsTitle: "評価期間管理",
    periodsDescription: "評価期間の作成とステータス管理",
    createPeriod: "期間を作成",
    periodName: "期間名",
    year: "年度",
    term: "期",
    termH1: "上期",
    termH2: "下期",
    termAnnual: "通期",
    startDate: "開始日",
    endDate: "終了日",
    status: "ステータス",
    statusDraft: "準備中",
    statusActive: "評価中",
    statusReview: "レビュー",
    statusClosed: "完了",
    evaluationCount: "評価数",
    generateEvaluations: "評価を一括生成",
    generateSuccess: "評価データを生成しました",
    changeStatus: "ステータス変更",
    confirmDelete: "この評価期間を削除しますか？",
    noPeriods: "評価期間がありません",

    // Weights
    weightsTitle: "重み設定",
    weightsDescription: "資格等級別の評価軸の重み配分を設定",
    gradeCode: "等級コード",
    resultsWeight: "結果評価",
    processWeight: "プロセス評価",
    growthWeight: "成長評価",
    total: "合計",
    addWeight: "重みを追加",
    defaultWeight: "デフォルト",
    weightError: "合計は100%である必要があります",

    // Organization Goals
    goalsTitle: "組織目標",
    goalsDescription: "組織ごとの目標・実績を設定",
    organizationType: "種別",
    organizationName: "組織名",
    targetProfit: "目標",
    actualProfit: "実績",
    achievementRate: "達成率",
    syncScores: "評価に反映",
    syncSuccess: "スコアを反映しました",
    typeDepartment: "本部",
    typeSection: "部",
    typeCourse: "課",

    // Custom Evaluators
    customEvaluatorsTitle: "カスタム評価者",
    customEvaluatorsDescription: "通常の組織階層とは異なる評価者を設定",
    employee: "被評価者",
    evaluator: "評価者",
    effectiveFrom: "有効開始日",
    effectiveTo: "有効終了日",
    allPeriods: "全期間",
    addCustomEvaluator: "カスタム評価者を追加",
    selectEmployee: "社員を選択",
    selectEvaluator: "評価者を選択",

    // Process Categories
    processCategoriesTitle: "プロセス評価項目",
    processCategoriesDescription: "行動特性の評価項目を定義",
    categoryName: "項目名",
    categoryNameEn: "項目名（英語）",
    description: "説明",
    sortOrder: "表示順",
    isActive: "有効",
    addCategory: "項目を追加",

    // Growth Categories
    growthCategoriesTitle: "成長カテゴリ",
    growthCategoriesDescription: "成長評価のカテゴリと係数を定義",
    coefficient: "係数",

    // Common
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    edit: "編集",
    loading: "読み込み中...",
    noData: "データなし",
    actions: "操作",
    selectPeriod: "期間を選択",
    refresh: "更新",
  },
} as const;

export type EvaluationMasterTranslation =
  | (typeof evaluationMasterTranslations)["en"]
  | (typeof evaluationMasterTranslations)["ja"];
