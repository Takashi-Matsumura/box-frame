export const myEvaluationTranslations = {
  en: {
    title: "My Evaluation",
    description: "View your evaluation results",

    // Tabs
    tabCurrentPeriod: "Current Period",
    tabHistory: "Evaluation History",

    // Period
    selectPeriod: "Select Period",
    noPeriods: "No evaluation periods available",
    periodInfo: "Period Information",
    periodName: "Period Name",
    startDate: "Start Date",
    endDate: "End Date",

    // Status
    statusPending: "Pending",
    statusInProgress: "In Progress",
    statusCompleted: "Completed",
    statusConfirmed: "Confirmed",

    // Evaluation info
    evaluationStatus: "Evaluation Status",
    evaluator: "Evaluator",
    noEvaluation: "No evaluation found for this period",

    // Employee info
    employeeInfo: "Your Information",
    employeeNumber: "Employee Number",
    department: "Department",
    section: "Section",
    course: "Course",
    position: "Position",
    grade: "Grade",

    // Results evaluation
    resultsEvaluation: "Results Evaluation",
    organizationGoal: "Organization Goal",
    targetValue: "Target",
    actualValue: "Actual",
    achievementRate: "Achievement Rate",
    resultsScore: "Results Score",

    // Process evaluation
    processEvaluation: "Process Evaluation",
    processCategories: "Categories",
    processScore: "Process Score",

    // Growth evaluation
    growthEvaluation: "Growth Evaluation",
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

    // Comments
    evaluatorComment: "Evaluator Comments",
    noComment: "No comments",

    // Interview
    interviewDate: "Interview Date",
    interviewDateLabel: "Interview with Evaluator",
    setInterviewDate: "Set Date",
    interviewDatePlaceholder: "Select interview date",
    interviewDateSaved: "Interview date saved",
    interviewDateCleared: "Interview date cleared",
    clearDate: "Clear",

    // Level labels
    levelT1: "T1: Needs Improvement",
    levelT2: "T2: Meets Expectations",
    levelT3: "T3: Exceeds Expectations",
    levelT4: "T4: Outstanding",

    // History
    historyTitle: "Your Evaluation History",
    historyDescription: "View your past evaluation results",
    noHistory: "No past evaluations found",
    viewDetails: "View Details",
    period: "Period",
    hideDetails: "Hide Details",

    // Common
    loading: "Loading...",
    noData: "No data",
    notYetEvaluated: "Not yet evaluated",
    pendingEvaluation:
      "Your evaluation is pending. Please wait for your evaluator to complete the assessment.",
    evaluationCompleted:
      "Your evaluation has been completed. Review the results below.",
  },
  ja: {
    title: "マイ評価",
    description: "あなたの評価結果を確認",

    // Tabs
    tabCurrentPeriod: "今期の評価",
    tabHistory: "評価履歴",

    // Period
    selectPeriod: "評価期間を選択",
    noPeriods: "評価期間がありません",
    periodInfo: "期間情報",
    periodName: "期間名",
    startDate: "開始日",
    endDate: "終了日",

    // Status
    statusPending: "未着手",
    statusInProgress: "評価中",
    statusCompleted: "評価完了",
    statusConfirmed: "確定済み",

    // Evaluation info
    evaluationStatus: "評価ステータス",
    evaluator: "評価者",
    noEvaluation: "この期間の評価が見つかりません",

    // Employee info
    employeeInfo: "あなたの情報",
    employeeNumber: "社員番号",
    department: "本部",
    section: "部",
    course: "課",
    position: "役職",
    grade: "等級",

    // Results evaluation
    resultsEvaluation: "結果評価",
    organizationGoal: "目標",
    targetValue: "目標",
    actualValue: "実績",
    achievementRate: "達成率",
    resultsScore: "結果評価スコア",

    // Process evaluation
    processEvaluation: "プロセス評価",
    processCategories: "評価項目",
    processScore: "プロセス評価スコア",

    // Growth evaluation
    growthEvaluation: "成長評価",
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

    // Comments
    evaluatorComment: "評価者コメント",
    noComment: "コメントなし",

    // Interview
    interviewDate: "面談実施日",
    interviewDateLabel: "評価者との面談",
    setInterviewDate: "日付を設定",
    interviewDatePlaceholder: "面談日を選択",
    interviewDateSaved: "面談実施日を保存しました",
    interviewDateCleared: "面談実施日をクリアしました",
    clearDate: "クリア",

    // Level labels
    levelT1: "T1: 改善が必要",
    levelT2: "T2: 期待通り",
    levelT3: "T3: 期待以上",
    levelT4: "T4: 卓越",

    // History
    historyTitle: "評価履歴",
    historyDescription: "過去の評価結果を確認",
    noHistory: "過去の評価がありません",
    viewDetails: "詳細を表示",
    period: "期間",
    hideDetails: "詳細を隠す",

    // Common
    loading: "読み込み中...",
    noData: "データなし",
    notYetEvaluated: "まだ評価されていません",
    pendingEvaluation:
      "あなたの評価は未着手です。評価者が評価を完了するまでお待ちください。",
    evaluationCompleted: "評価が完了しました。以下の結果をご確認ください。",
  },
} as const;

export type MyEvaluationTranslation =
  | (typeof myEvaluationTranslations)["en"]
  | (typeof myEvaluationTranslations)["ja"];
