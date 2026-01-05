"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FaCheckCircle,
  FaPlus,
  FaTimes,
  FaProjectDiagram,
  FaClipboardCheck,
} from "react-icons/fa";

// プロジェクト難易度チェック項目
const difficultyChecks = [
  { id: "cross_dept", labelJa: "部門横断の調整が必要", labelEn: "Involves cross-departmental coordination" },
  { id: "stakeholders", labelJa: "複数のステークホルダーが関与", labelEn: "Multiple stakeholders involved" },
  { id: "budget", labelJa: "重要な予算責任を負う", labelEn: "Significant budget responsibility" },
  { id: "new_challenge", labelJa: "前例のない新しい挑戦", labelEn: "New challenge with no precedent" },
  { id: "strategic", labelJa: "戦略的重要度が高い", labelEn: "High strategic importance" },
];

// 達成度レベル定義
const achievementLevels = [
  { level: "T4", labelJa: "卓越した水準", labelEn: "Exceptional", descJa: "期待を大幅に上回る成果", descEn: "Far exceeded expectations" },
  { level: "T3", labelJa: "期待を超過", labelEn: "Exceeded", descJa: "目標を上回る成果を達成", descEn: "Exceeded targets" },
  { level: "T2", labelJa: "期待通り", labelEn: "As Expected", descJa: "計画通り目標を達成", descEn: "Met targets as planned" },
  { level: "T1", labelJa: "改善を要する", labelEn: "Needs Improvement", descJa: "目標達成に至らず", descEn: "Did not meet targets" },
];

// クラス×達成度のスコアマトリクス (1.0-5.0スケール)
const scoreMatrix: Record<string, Record<string, number>> = {
  A: { T4: 5.0, T3: 4.5, T2: 3.5, T1: 2.0 },
  B: { T4: 4.5, T3: 4.0, T2: 3.0, T1: 1.5 },
  C: { T4: 4.0, T3: 3.5, T2: 2.5, T1: 1.0 },
};

interface Project {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  achievement: string;
}

interface ProcessEvaluationSupportProps {
  language: "en" | "ja";
  onScoreCalculated: (score: number, projects: Project[]) => void;
  initialProjects?: Project[];
}

function getProjectClass(checks: Record<string, boolean>): string {
  const checkedCount = Object.values(checks).filter(Boolean).length;
  if (checkedCount >= 4) return "A";
  if (checkedCount >= 2) return "B";
  return "C";
}

function getProjectScore(projectClass: string, achievement: string): number {
  return scoreMatrix[projectClass]?.[achievement] ?? 2.5;
}

export function ProcessEvaluationSupport({
  language,
  onScoreCalculated,
  initialProjects,
}: ProcessEvaluationSupportProps) {
  const [projects, setProjects] = useState<Project[]>(
    initialProjects || [
      {
        id: "1",
        name: "",
        checks: {},
        achievement: "T2",
      },
    ]
  );

  // 平均スコアを計算
  const averageScore = useMemo(() => {
    const validProjects = projects.filter((p) => p.name.trim() && p.achievement);
    if (validProjects.length === 0) return 0;

    const totalScore = validProjects.reduce((sum, p) => {
      const projectClass = getProjectClass(p.checks);
      return sum + getProjectScore(projectClass, p.achievement);
    }, 0);

    return Math.round((totalScore / validProjects.length) * 10) / 10;
  }, [projects]);

  // スコアが変更されたら親に通知
  useEffect(() => {
    onScoreCalculated(averageScore, projects);
  }, [averageScore, projects, onScoreCalculated]);

  const addProject = () => {
    if (projects.length >= 3) return;
    setProjects([
      ...projects,
      {
        id: String(Date.now()),
        name: "",
        checks: {},
        achievement: "T2",
      },
    ]);
  };

  const removeProject = (id: string) => {
    if (projects.length <= 1) return;
    setProjects(projects.filter((p) => p.id !== id));
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(
      projects.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const toggleCheck = (projectId: string, checkId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    updateProject(projectId, {
      checks: {
        ...project.checks,
        [checkId]: !project.checks[checkId],
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* プロジェクト一覧 */}
      {projects.map((project, index) => {
        const projectClass = getProjectClass(project.checks);
        const projectScore = getProjectScore(projectClass, project.achievement);
        const checkedCount = Object.values(project.checks).filter(Boolean).length;

        return (
          <div
            key={project.id}
            className="bg-green-50 rounded-lg p-4 border border-green-200"
          >
            {/* プロジェクトヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaProjectDiagram className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-900">
                  {language === "ja" ? `プロジェクト ${index + 1}` : `Project ${index + 1}`}
                </span>
              </div>
              {projects.length > 1 && (
                <button
                  onClick={() => removeProject(project.id)}
                  className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  <FaTimes className="w-4 h-4" />
                  <span>{language === "ja" ? "削除" : "Remove"}</span>
                </button>
              )}
            </div>

            {/* プロジェクト名 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ja" ? "プロジェクト名" : "Project Name"}
              </label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => updateProject(project.id, { name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={language === "ja" ? "プロジェクト名を入力" : "Enter project name"}
              />
            </div>

            {/* 難易度チェックリスト */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FaClipboardCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {language === "ja" ? "難易度チェックリスト" : "Difficulty Checklist"}
                </span>
                <span className="text-xs text-gray-500">
                  ({checkedCount}/5 {language === "ja" ? "項目選択" : "selected"})
                </span>
              </div>
              <div className="bg-white rounded-lg p-3 space-y-2">
                {difficultyChecks.map((check) => (
                  <label
                    key={check.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={project.checks[check.id] || false}
                      onChange={() => toggleCheck(project.id, check.id)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {language === "ja" ? check.labelJa : check.labelEn}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* プロジェクトクラス表示 */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">
                {language === "ja" ? "プロジェクトクラス:" : "Project Class:"}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  projectClass === "A"
                    ? "bg-red-100 text-red-700"
                    : projectClass === "B"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {language === "ja"
                  ? projectClass === "A"
                    ? "クラスA（高難度）"
                    : projectClass === "B"
                    ? "クラスB（中難度）"
                    : "クラスC（標準）"
                  : projectClass === "A"
                  ? "Class A (High)"
                  : projectClass === "B"
                  ? "Class B (Medium)"
                  : "Class C (Standard)"}
              </span>
            </div>

            {/* 達成度選択 */}
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700 block mb-2">
                {language === "ja" ? "達成度" : "Achievement Level"}
              </span>
              <div className="flex gap-2">
                {achievementLevels.map((level) => {
                  const score = scoreMatrix[projectClass]?.[level.level] ?? 0;
                  return (
                    <button
                      key={level.level}
                      onClick={() => updateProject(project.id, { achievement: level.level })}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-center transition-all ${
                        project.achievement === level.level
                          ? "border-green-600 bg-green-100 shadow-md"
                          : "border-gray-300 bg-white hover:border-green-400 hover:bg-green-50"
                      }`}
                      title={language === "ja" ? level.descJa : level.descEn}
                    >
                      <p className="font-bold text-sm text-gray-900">
                        {level.level} - {score.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {language === "ja" ? level.labelJa : level.labelEn}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* プロジェクトスコア */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-green-200">
              <span className="text-sm text-gray-600">
                {language === "ja" ? "プロジェクトスコア:" : "Project Score:"}
              </span>
              <span className="text-xl font-bold text-green-700">
                {projectScore.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}

      {/* プロジェクト追加ボタン */}
      {projects.length < 3 && (
        <button
          onClick={addProject}
          className="w-full py-3 border-2 border-dashed border-green-400 text-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
        >
          <FaPlus className="w-4 h-4" />
          <span className="font-medium">
            {language === "ja" ? "プロジェクトを追加" : "Add Project"}
          </span>
        </button>
      )}

      {/* 最終スコア表示 */}
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-gray-900">
              {language === "ja" ? "プロセス評価最終スコア" : "Final Process Evaluation Score"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              ({projects.filter((p) => p.name.trim()).length}{" "}
              {language === "ja" ? "プロジェクトの平均" : "project(s) average"})
            </span>
            <span className="text-3xl font-bold text-green-700">
              {averageScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
