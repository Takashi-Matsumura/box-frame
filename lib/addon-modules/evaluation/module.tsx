/**
 * 人事評価モジュール
 *
 * 3軸評価（結果・プロセス・成長）による人事評価システム
 * - 結果評価: 組織目標の達成率に基づく自動計算
 * - プロセス評価: 5つの行動特性による評価
 * - 成長評価: カテゴリ別の成長度評価
 */

import type { AppModule } from "@/types/module";
import { getModuleIcon, getMenuIcon } from "@/lib/modules/icons";

export const evaluationModule: AppModule = {
  id: "evaluation",
  name: "HR Evaluation",
  nameJa: "人事評価",
  description: "Performance evaluation system with 3-axis scoring",
  descriptionJa: "3軸評価（結果・プロセス・成長）による人事評価システム",
  icon: getModuleIcon("hrEvaluation"),
  enabled: true,
  order: 30,
  dependencies: ["organization"],
  menus: [
    // ユーザー向けメニュー: 自分の評価確認
    {
      id: "myEvaluation",
      moduleId: "evaluation",
      name: "My Evaluation",
      nameJa: "自分の評価",
      path: "/my-evaluation",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 20,
      icon: getMenuIcon("myEvaluation", "evaluation"),
      description: "View your evaluation results and set goals",
      descriptionJa: "自分の評価結果の確認と目標設定",
      isImplemented: false,
    },
    // マネージャー向けメニュー: 人事評価
    {
      id: "teamEvaluations",
      moduleId: "evaluation",
      name: "HR Evaluation",
      nameJa: "人事評価",
      path: "/manager/evaluations",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 20,
      icon: getMenuIcon("teamEvaluations", "evaluation"),
      description: "Evaluate team members performance",
      descriptionJa: "チームメンバーの評価入力",
      isImplemented: true,
    },
    // マネージャー向けメニュー: 評価者設定
    {
      id: "evaluatorSettings",
      moduleId: "evaluation",
      name: "Evaluator Settings",
      nameJa: "評価者設定",
      path: "/manager/evaluator-settings",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 25,
      icon: getMenuIcon("evaluatorSettings", "evaluation"),
      description: "Configure custom evaluators for team members",
      descriptionJa: "部下のカスタム評価者を設定",
      isImplemented: true,
    },
    // 管理者向けメニュー: 評価マスタ管理
    {
      id: "evaluationMaster",
      moduleId: "evaluation",
      name: "Evaluation Master",
      nameJa: "評価マスタ",
      path: "/admin/evaluation-master",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 70,
      icon: getMenuIcon("evaluationMaster", "evaluation"),
      description: "Manage evaluation periods, weights, and categories",
      descriptionJa: "評価期間・重み・カテゴリの管理",
      isImplemented: true,
    },
    // 管理者向けメニュー: 評価AIサポート設定
    {
      id: "evaluationRag",
      moduleId: "evaluation",
      name: "Evaluation AI Support",
      nameJa: "評価AIサポート",
      path: "/admin/evaluation-rag",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 75,
      icon: getMenuIcon("evaluationRag", "evaluation"),
      description: "Configure AI assistant settings and knowledge base",
      descriptionJa: "AIアシスタントの設定とナレッジベース管理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "evaluationScoring",
      moduleId: "evaluation",
      name: "Evaluation Scoring",
      nameJa: "評価スコア計算",
      description: "Calculate weighted scores and final grades",
      descriptionJa: "加重スコアと最終グレードの計算",
      apiEndpoints: [
        "/api/evaluation/[id]",
        "/api/evaluation/[id]/complete",
      ],
      enabled: true,
    },
    {
      id: "evaluationBatch",
      moduleId: "evaluation",
      name: "Evaluation Batch",
      nameJa: "評価一括生成",
      description: "Generate evaluation records for all employees",
      descriptionJa: "全社員の評価レコードを一括生成",
      apiEndpoints: ["/api/evaluation/periods/[id]/generate"],
      enabled: true,
    },
    {
      id: "customEvaluators",
      moduleId: "evaluation",
      name: "Custom Evaluators",
      nameJa: "カスタム評価者",
      description: "Manage custom evaluator relationships",
      descriptionJa: "カスタム評価者関係の管理",
      apiEndpoints: [
        "/api/evaluation/custom-evaluators",
        "/api/evaluation/custom-evaluators/[id]",
      ],
      enabled: true,
    },
  ],
};
