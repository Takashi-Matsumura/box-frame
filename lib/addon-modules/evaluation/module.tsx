/**
 * 人事評価モジュール
 *
 * 3軸評価（結果・プロセス・成長）による人事評価システム
 * - 結果評価: 組織目標の達成率に基づく自動計算
 * - プロセス評価: 5つの行動特性による評価
 * - 成長評価: カテゴリ別の成長度評価
 */

import type { AppModule, AppTab } from "@/types/module";
import { getModuleIcon, getMenuIcon } from "@/lib/modules/icons";
import { FaDatabase, FaStar, FaCalendarAlt, FaBalanceScale, FaClipboardList, FaHistory, FaBullseye } from "react-icons/fa";
import { TbCircleNumber1Filled, TbCircleNumber2Filled, TbCircleNumber3Filled } from "react-icons/tb";

/**
 * 自分の評価タブ定義
 */
const myEvaluationTabs: AppTab[] = [
  {
    id: "current",
    name: "Current Period",
    nameJa: "今期の評価",
    icon: <FaClipboardList className="w-4 h-4" />,
    order: 1,
    enabled: true,
    allowAccessKey: true,
    description: "View current period evaluation",
    descriptionJa: "今期の評価を確認",
  },
  {
    id: "goals",
    name: "Goal Setting",
    nameJa: "目標設定",
    icon: <FaBullseye className="w-4 h-4" />,
    order: 2,
    enabled: true,
    allowAccessKey: true,
    description: "Set process and growth goals",
    descriptionJa: "プロセス目標と成長目標を設定",
  },
  {
    id: "history",
    name: "Evaluation History",
    nameJa: "評価履歴",
    icon: <FaHistory className="w-4 h-4" />,
    order: 3,
    enabled: true,
    allowAccessKey: true,
    description: "View past evaluation history",
    descriptionJa: "過去の評価履歴を確認",
  },
];

/**
 * 評価マスタタブ定義
 */
const evaluationMasterTabs: AppTab[] = [
  {
    id: "periods",
    name: "Periods",
    nameJa: "評価期間",
    icon: <FaCalendarAlt className="w-4 h-4" />,
    order: 1,
    enabled: true,
    allowAccessKey: true,
    description: "Manage evaluation periods",
    descriptionJa: "評価期間の管理",
  },
  {
    id: "weights",
    name: "Weights",
    nameJa: "評価重み",
    icon: <FaBalanceScale className="w-5 h-5" />,
    order: 2,
    enabled: true,
    allowAccessKey: false, // 重み設定は機密性が高い
    description: "Configure evaluation weights by role",
    descriptionJa: "役職別の評価重みを設定",
  },
  {
    id: "organizationGoals",
    name: "Results Evaluation",
    nameJa: "結果評価",
    icon: <TbCircleNumber1Filled className="w-5 h-5" />,
    order: 3,
    enabled: true,
    allowAccessKey: true,
    description: "Manage organization goals and results criteria",
    descriptionJa: "組織目標と結果評価基準の管理",
  },
  {
    id: "processCategories",
    name: "Process Categories",
    nameJa: "プロセス評価",
    icon: <TbCircleNumber2Filled className="w-5 h-5" />,
    order: 4,
    enabled: true,
    allowAccessKey: true,
    description: "Manage process evaluation categories",
    descriptionJa: "プロセス評価カテゴリの管理",
  },
  {
    id: "growthCategories",
    name: "Growth Categories",
    nameJa: "成長評価",
    icon: <TbCircleNumber3Filled className="w-5 h-5" />,
    order: 5,
    enabled: true,
    allowAccessKey: true,
    description: "Manage growth evaluation categories",
    descriptionJa: "成長評価カテゴリの管理",
  },
];

/**
 * 評価AIサポートタブ定義
 */
const evaluationRagTabs: AppTab[] = [
  {
    id: "knowledge-base",
    name: "Knowledge Base",
    nameJa: "ナレッジベース",
    icon: <FaDatabase className="w-5 h-5" />,
    order: 1,
    enabled: true,
    allowAccessKey: true,
    description: "Manage AI knowledge base documents",
    descriptionJa: "AIナレッジベースのドキュメント管理",
  },
  {
    id: "system-prompt",
    name: "System Prompt",
    nameJa: "システムプロンプト",
    icon: <FaStar className="w-5 h-5" />,
    order: 2,
    enabled: true,
    allowAccessKey: false, // プロンプト設定は機密性が高い
    description: "Configure AI system prompt",
    descriptionJa: "AIシステムプロンプトの設定",
  },
];

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
      isImplemented: true,
      tabs: myEvaluationTabs,
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
      tabs: evaluationMasterTabs,
      allowAccessKey: true,
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
      tabs: evaluationRagTabs,
      allowAccessKey: true,
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
