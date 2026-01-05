"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FolderKanban, ClipboardCheck, CheckCircle2 } from "lucide-react";

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
          <Card key={project.id}>
            <CardContent className="p-4 space-y-4">
              {/* プロジェクトヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-green-500 dark:text-green-400" />
                  <span className="font-medium">
                    {language === "ja" ? `プロジェクト ${index + 1}` : `Project ${index + 1}`}
                  </span>
                </div>
                {projects.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProject(project.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {language === "ja" ? "削除" : "Remove"}
                  </Button>
                )}
              </div>

              {/* プロジェクト名 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === "ja" ? "プロジェクト名" : "Project Name"}
                </label>
                <Input
                  value={project.name}
                  onChange={(e) => updateProject(project.id, { name: e.target.value })}
                  placeholder={language === "ja" ? "プロジェクト名を入力" : "Enter project name"}
                />
              </div>

              {/* 難易度チェックリスト */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {language === "ja" ? "難易度チェックリスト" : "Difficulty Checklist"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {checkedCount}/5
                  </Badge>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  {difficultyChecks.map((check) => (
                    <label
                      key={check.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-md transition-colors"
                    >
                      <Checkbox
                        checked={project.checks[check.id] || false}
                        onCheckedChange={() => toggleCheck(project.id, check.id)}
                      />
                      <span className="text-sm">
                        {language === "ja" ? check.labelJa : check.labelEn}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* プロジェクトクラス表示 */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {language === "ja" ? "プロジェクトクラス:" : "Project Class:"}
                </span>
                <Badge
                  variant={projectClass === "A" ? "default" : projectClass === "B" ? "secondary" : "outline"}
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
                </Badge>
              </div>

              {/* 達成度選択 */}
              <div>
                <span className="text-sm font-medium mb-3 block">
                  {language === "ja" ? "達成度" : "Achievement Level"}
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {achievementLevels.map((level) => {
                    const score = scoreMatrix[projectClass]?.[level.level] ?? 0;
                    const isSelected = project.achievement === level.level;
                    return (
                      <button
                        key={level.level}
                        onClick={() => updateProject(project.id, { achievement: level.level })}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? "border-green-500 bg-green-500/10 dark:border-green-400 dark:bg-green-400/10"
                            : "border-border hover:border-green-500/50 hover:bg-muted/50"
                        }`}
                        title={language === "ja" ? level.descJa : level.descEn}
                      >
                        <p className={`font-bold text-sm ${isSelected ? "text-green-600 dark:text-green-400" : ""}`}>
                          {level.level}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === "ja" ? level.labelJa : level.labelEn}
                        </p>
                        <p className={`text-sm font-medium mt-1 ${isSelected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {score.toFixed(1)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* プロジェクトスコア */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {language === "ja" ? "プロジェクトスコア:" : "Project Score:"}
                </span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {projectScore.toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* プロジェクト追加ボタン */}
      {projects.length < 3 && (
        <Button
          variant="outline"
          onClick={addProject}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === "ja" ? "プロジェクトを追加" : "Add Project"}
        </Button>
      )}

      {/* 最終スコア表示 */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
          <span className="font-medium">
            {language === "ja" ? "プロセス評価最終スコア" : "Final Process Evaluation Score"}
          </span>
          <span className="text-sm text-muted-foreground">
            ({projects.filter((p) => p.name.trim()).length}{" "}
            {language === "ja" ? "プロジェクトの平均" : "project(s) average"})
          </span>
        </div>
        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
          {averageScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
