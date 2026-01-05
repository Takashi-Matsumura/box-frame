export const evaluationsTranslations = {
  en: {
    title: "Team Evaluations",
    description: "Evaluate your team members",

    // Period selection
    selectPeriod: "Select Period",
    noPeriods: "No active evaluation periods",
    periodInfo: "Period Information",
    periodStatus: "Status",
    startDate: "Start Date",
    endDate: "End Date",

    // Status
    statusDraft: "Draft",
    statusActive: "Active",
    statusReview: "Review",
    statusClosed: "Closed",

    // Evaluatee list
    evaluatees: "Team Members",
    evaluateeCount: "members",
    noEvaluatees: "No team members to evaluate",

    // Evaluation status
    evalPending: "Pending",
    evalInProgress: "In Progress",
    evalCompleted: "Completed",
    evalConfirmed: "Confirmed",

    // Evaluation form
    evaluateButton: "Evaluate",
    viewButton: "View",
    employeeInfo: "Employee Information",
    employeeNumber: "Employee Number",
    department: "Department",
    section: "Section",
    course: "Course",
    position: "Position",
    grade: "Grade",

    // Results evaluation
    resultsEvaluation: "Results Evaluation",
    resultsDescription: "Evaluate based on organization goal achievement",
    organizationGoal: "Organization Goal",
    targetValue: "Target",
    actualValue: "Actual",
    achievementRate: "Achievement Rate",
    resultsScore: "Results Score",

    // Process evaluation
    processEvaluation: "Process Evaluation",
    processDescription: "Evaluate behavioral competencies",
    processCategories: "Categories",
    processLevel: "Level",
    levelT1: "T1: Needs Improvement",
    levelT2: "T2: Meets Expectations",
    levelT3: "T3: Exceeds Expectations",
    levelT4: "T4: Outstanding",
    processScore: "Process Score",

    // Growth evaluation
    growthEvaluation: "Growth Evaluation",
    growthDescription: "Evaluate growth and development",
    growthCategory: "Growth Category",
    growthLevel: "Growth Level",
    growthScore: "Growth Score",
    coefficient: "Coefficient",

    // Weights
    weights: "Evaluation Weights",
    resultsWeight: "Results Weight",
    processWeight: "Process Weight",
    growthWeight: "Growth Weight",

    // Score summary
    scoreSummary: "Score Summary",
    score1: "Results Score",
    score2: "Process Score",
    score3: "Growth Score",
    finalScore: "Final Score",
    finalGrade: "Final Grade",
    gradeS: "S (Excellent)",
    gradeA: "A (Good)",
    gradeB: "B (Standard)",
    gradeC: "C (Needs Improvement)",
    gradeD: "D (Poor)",

    // Comments
    evaluatorComment: "Evaluator Comments",
    commentPlaceholder: "Enter your comments about this evaluation...",

    // Actions
    save: "Save Draft",
    complete: "Complete Evaluation",
    confirmComplete: "Are you sure you want to complete this evaluation? This action cannot be undone.",
    back: "Back to List",
    saving: "Saving...",
    completing: "Completing...",

    // Messages
    saveSuccess: "Evaluation saved successfully",
    completeSuccess: "Evaluation completed successfully",
    saveError: "Failed to save evaluation",
    completeError: "Failed to complete evaluation",
    loading: "Loading...",
    noData: "No data",

    // Validation
    allFieldsRequired: "Please fill in all evaluation fields",
    weightSum: "Weights must sum to 100%",

    // Filter (ADMIN only)
    searchPlaceholder: "Search by name or ID...",
    allDepartments: "All Departments",
    allSections: "All Sections",
    allCourses: "All Courses",
    allStatuses: "All Statuses",
    incompleteOnly: "Incomplete Only",
    filtered: "filtered",
    clearFilter: "Clear",

    // Score Cards
    scoreCard: {
      results: "Results Evaluation",
      process: "Process Evaluation",
      growth: "Growth Evaluation",
      final: "Final Score",
      expanded: "Expanded",
      clickToExpand: "Click to expand",
      weighted: "Weighted",
    },

    // Results Panel
    resultsPanel: {
      title: "Results Evaluation Details",
      organizationTarget: "Organization Target",
      actual: "Actual",
      achievementRate: "Achievement Rate",
      scoreConversion: "Score Conversion Table",
      rate120: "120% or above",
      rate100: "100% or above",
      rate80: "80% or above",
      rateBelow80: "Below 80%",
      calculatedScore: "Calculated Score",
    },

    // Process Panel
    processPanel: {
      title: "Process Evaluation Details",
      addProject: "Add Project",
      projectName: "Project Name",
      projectClass: "Project Class",
      difficultyChecklist: "Difficulty Checklist",
      check1: "Involves cross-departmental coordination",
      check2: "Multiple stakeholders involved",
      check3: "Significant budget responsibility",
      check4: "New challenge with no precedent",
      check5: "High strategic importance",
      classA: "Class A (High Difficulty)",
      classB: "Class B (Medium Difficulty)",
      classC: "Class C (Standard)",
      achievement: "Achievement Level",
      projectScore: "Project Score",
      averageScore: "Average Score",
      applyScore: "Apply This Score",
      removeProject: "Remove",
    },

    // Growth Panel
    growthPanel: {
      title: "Growth Evaluation Details",
      selectCategory: "Select Category",
      categoryPlaceholder: "Please select a category",
      achievementLevel: "Achievement Level",
      t4: "T4 - Exceptional",
      t4desc: "Far exceeded expectations with significant organizational impact",
      t3: "T3 - Exceeded",
      t3desc: "Exceeded targets and created high added value",
      t2: "T2 - As Expected",
      t2desc: "Met targets as planned with standard results",
      t1: "T1 - Needs Improvement",
      t1desc: "Did not meet targets; improvement needed",
      calculationFormula: "Score = Base Score × Coefficient",
      applyScore: "Apply This Score",
    },

    // Final Score Panel
    finalPanel: {
      title: "Final Score Calculation",
      incomplete: "Incomplete",
      complete: "Complete",
      scoreBreakdown: "Score Breakdown",
      missingItems: "Missing Items",
    },
  },
  ja: {
    title: "部下評価",
    description: "部下の評価を行います",

    // Period selection
    selectPeriod: "評価期間を選択",
    noPeriods: "アクティブな評価期間がありません",
    periodInfo: "期間情報",
    periodStatus: "ステータス",
    startDate: "開始日",
    endDate: "終了日",

    // Status
    statusDraft: "準備中",
    statusActive: "評価中",
    statusReview: "レビュー",
    statusClosed: "完了",

    // Evaluatee list
    evaluatees: "評価対象者",
    evaluateeCount: "名",
    noEvaluatees: "評価対象者がいません",

    // Evaluation status
    evalPending: "未着手",
    evalInProgress: "評価中",
    evalCompleted: "評価完了",
    evalConfirmed: "確定済み",

    // Evaluation form
    evaluateButton: "評価する",
    viewButton: "参照",
    employeeInfo: "社員情報",
    employeeNumber: "社員番号",
    department: "本部",
    section: "部",
    course: "課",
    position: "役職",
    grade: "等級",

    // Results evaluation
    resultsEvaluation: "結果評価",
    resultsDescription: "組織目標の達成度に基づいて評価",
    organizationGoal: "組織目標",
    targetValue: "目標",
    actualValue: "実績",
    achievementRate: "達成率",
    resultsScore: "結果評価スコア",

    // Process evaluation
    processEvaluation: "プロセス評価",
    processDescription: "行動特性を評価",
    processCategories: "評価項目",
    processLevel: "評価レベル",
    levelT1: "T1: 改善が必要",
    levelT2: "T2: 期待通り",
    levelT3: "T3: 期待以上",
    levelT4: "T4: 卓越",
    processScore: "プロセス評価スコア",

    // Growth evaluation
    growthEvaluation: "成長評価",
    growthDescription: "成長・発展を評価",
    growthCategory: "成長カテゴリ",
    growthLevel: "成長レベル",
    growthScore: "成長評価スコア",
    coefficient: "係数",

    // Weights
    weights: "評価軸の重み",
    resultsWeight: "結果評価の重み",
    processWeight: "プロセス評価の重み",
    growthWeight: "成長評価の重み",

    // Score summary
    scoreSummary: "スコアサマリー",
    score1: "結果評価スコア",
    score2: "プロセス評価スコア",
    score3: "成長評価スコア",
    finalScore: "最終スコア",
    finalGrade: "最終評価",
    gradeS: "S（卓越）",
    gradeA: "A（優秀）",
    gradeB: "B（標準）",
    gradeC: "C（改善が必要）",
    gradeD: "D（要改善）",

    // Comments
    evaluatorComment: "評価者コメント",
    commentPlaceholder: "評価に関するコメントを入力してください...",

    // Actions
    save: "下書き保存",
    complete: "評価を完了",
    confirmComplete: "評価を完了しますか？この操作は取り消せません。",
    back: "一覧に戻る",
    saving: "保存中...",
    completing: "完了処理中...",

    // Messages
    saveSuccess: "評価を保存しました",
    completeSuccess: "評価を完了しました",
    saveError: "評価の保存に失敗しました",
    completeError: "評価の完了に失敗しました",
    loading: "読み込み中...",
    noData: "データなし",

    // Validation
    allFieldsRequired: "すべての評価項目を入力してください",
    weightSum: "重みの合計は100%である必要があります",

    // Filter (ADMIN only)
    searchPlaceholder: "社員名・社員番号で検索...",
    allDepartments: "すべての本部",
    allSections: "すべての部",
    allCourses: "すべての課",
    allStatuses: "すべてのステータス",
    incompleteOnly: "未完了のみ",
    filtered: "件表示中",
    clearFilter: "クリア",

    // Score Cards
    scoreCard: {
      results: "結果評価",
      process: "プロセス評価",
      growth: "成長評価",
      final: "最終スコア",
      expanded: "展開中",
      clickToExpand: "クリックで展開",
      weighted: "加重スコア",
    },

    // Results Panel
    resultsPanel: {
      title: "結果評価の算定根拠",
      organizationTarget: "組織目標",
      actual: "実績",
      achievementRate: "達成率",
      scoreConversion: "スコア変換テーブル",
      rate120: "120%以上",
      rate100: "100%以上",
      rate80: "80%以上",
      rateBelow80: "80%未満",
      calculatedScore: "算出スコア",
    },

    // Process Panel
    processPanel: {
      title: "プロセス評価の算定根拠",
      addProject: "プロジェクトを追加",
      projectName: "プロジェクト名",
      projectClass: "プロジェクトクラス",
      difficultyChecklist: "難易度チェックリスト",
      check1: "部門横断の調整が必要",
      check2: "複数のステークホルダーが関与",
      check3: "重要な予算責任を負う",
      check4: "前例のない新しい挑戦",
      check5: "戦略的重要度が高い",
      classA: "クラスA（高難度）",
      classB: "クラスB（中難度）",
      classC: "クラスC（標準）",
      achievement: "達成度",
      projectScore: "プロジェクトスコア",
      averageScore: "平均スコア",
      applyScore: "このスコアを適用",
      removeProject: "削除",
    },

    // Growth Panel
    growthPanel: {
      title: "成長評価の算定根拠",
      selectCategory: "カテゴリを選択",
      categoryPlaceholder: "カテゴリを選択してください",
      achievementLevel: "達成度",
      t4: "T4 - 卓越した水準",
      t4desc: "期待を大幅に上回る成果を上げ、組織の優位性に顕著なインパクトを与えた",
      t3: "T3 - 期待を超過",
      t3desc: "目標を上回る成果を達成し、高い付加価値を創出した",
      t2: "T2 - 期待通り",
      t2desc: "計画通り目標を概ね達成し、標準的な成果を示した",
      t1: "T1 - 改善を要する",
      t1desc: "目標達成に至らず、改善策の検討・実行が必要である",
      calculationFormula: "スコア = ベーススコア × 係数",
      applyScore: "このスコアを適用",
    },

    // Final Score Panel
    finalPanel: {
      title: "最終スコア計算",
      incomplete: "未入力",
      complete: "入力済",
      scoreBreakdown: "スコア内訳",
      missingItems: "未入力項目",
    },
  },
} as const;

export type EvaluationsTranslation =
  | (typeof evaluationsTranslations)["en"]
  | (typeof evaluationsTranslations)["ja"];
