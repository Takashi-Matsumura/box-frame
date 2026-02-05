"use client";

import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Circle,
  Cloud,
  CloudOff,
  Loader2,
  Plus,
  Send,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UseGoalDataReturn } from "../hooks/useGoalData";
import { myEvaluationTranslations } from "../translations";
import { EvaluationCalendar } from "./EvaluationCalendar";
import { GoalAIAssistant } from "./GoalAIAssistant";
import PreviousReviewSection from "./PreviousReviewSection";
import { StarRating } from "./StarRating";

type PhaseId = "review" | "goals" | "progress" | "self-eval";

interface PhaseStatus {
  completed: boolean;
  current: boolean;
}

interface MyEvaluation {
  id: string;
  status: string;
  score1: number | null;
  score2: number | null;
  score3: number | null;
  processScores: Record<string, number> | null;
  growthCategoryId: string | null;
  growthLevel: number | null;
  finalScore: number | null;
  finalGrade: string | null;
  evaluatorComment: string | null;
  employee: {
    employeeNumber: string;
    lastName: string;
    firstName: string;
    lastNameEn: string | null;
    firstNameEn: string | null;
    position: string | null;
    qualificationGrade: string | null;
    department: { name: string } | null;
    section: { name: string } | null;
    course: { name: string } | null;
  };
  evaluator: {
    lastName: string;
    firstName: string;
    lastNameEn: string | null;
    firstNameEn: string | null;
  } | null;
  weights: {
    resultsWeight: number;
    processWeight: number;
    growthWeight: number;
  };
  organizationGoal: {
    targetValue: number;
    actualValue: number | null;
    achievementRate: number | null;
  } | null;
  processCategories: { id: string; name: string; nameEn: string | null }[];
  growthCategories: {
    id: string;
    name: string;
    nameEn: string | null;
    coefficient: number;
  }[];
}

interface EvaluationCycleStepperProps {
  language: "en" | "ja";
  periodStatus: string;
  goalData: UseGoalDataReturn;
  previousEvaluation: MyEvaluation | null;
  previousEvaluationLoading: boolean;
}

// Goal setting section translations (inline)
const goalTranslations = {
  en: {
    processGoals: "Process Goals",
    processGoalsDescription: "Set goals for your work processes and projects",
    defaultProcess: "Regular Work",
    processName: "Process Name",
    processGoalText: "Goal Description",
    processGoalPlaceholder:
      "Describe what you want to achieve in this process...",
    addProcess: "Add Process",
    growthGoals: "Growth Goals",
    growthGoalsDescription:
      "Select a growth category and set your development goal",
    selectCategory: "Select Category",
    growthGoalText: "Growth Goal",
    growthGoalPlaceholder: "Describe your growth goal for this category...",
    cannotDelete: "Default process cannot be deleted",
    process: "Process",
    noCategories:
      "No growth categories available. Please contact the administrator.",
    selfEvaluationLabel: "How well did you achieve this goal?",
    selfEvaluationCommentPlaceholder:
      "Describe the reasons or evidence for your evaluation...",
    submitConfirm:
      "Once submitted, you cannot edit your self evaluation. Are you sure?",
    submitSuccess: "Self evaluation submitted successfully",
    submitError: "Failed to submit self evaluation",
    submitSelfEvaluation: "Submit Self Evaluation",
    saving: "Saving...",
    saved: "Saved",
    saveError: "Failed to save goals",
    autoSave: "Auto-save",
  },
  ja: {
    processGoals: "プロセス目標",
    processGoalsDescription: "業務プロセスやプロジェクトの目標を設定",
    defaultProcess: "通常業務",
    processName: "プロセス名",
    processGoalText: "目標内容",
    processGoalPlaceholder: "このプロセスで達成したいことを記述してください...",
    addProcess: "プロセスを追加",
    growthGoals: "成長目標",
    growthGoalsDescription: "成長カテゴリを選択し、成長目標を設定",
    selectCategory: "カテゴリを選択",
    growthGoalText: "成長目標",
    growthGoalPlaceholder: "このカテゴリでの成長目標を記述してください...",
    cannotDelete: "デフォルトのプロセスは削除できません",
    process: "プロセス",
    noCategories: "成長カテゴリがありません。管理者にお問い合わせください。",
    selfEvaluationLabel: "この目標をどの程度達成できましたか？",
    selfEvaluationCommentPlaceholder: "評価の理由や根拠を記入してください...",
    submitConfirm: "提出すると自己評価は編集できなくなります。よろしいですか？",
    submitSuccess: "自己評価を提出しました",
    submitError: "自己評価の提出に失敗しました",
    submitSelfEvaluation: "自己評価を提出",
    saving: "保存中...",
    saved: "保存しました",
    saveError: "保存に失敗しました",
    autoSave: "自動保存",
  },
};

export default function EvaluationCycleStepper({
  language,
  periodStatus,
  goalData,
  previousEvaluation,
  previousEvaluationLoading,
}: EvaluationCycleStepperProps) {
  const t = myEvaluationTranslations[language];
  const gt = goalTranslations[language];

  // Determine phase statuses
  const phaseStatuses = useMemo((): Record<PhaseId, PhaseStatus> => {
    const hasGoals = goalData.hasGoals;
    const isSelfEvalSubmitted = goalData.selfEvaluationStatus === "SUBMITTED";
    const hasPreviousEvaluation =
      previousEvaluation &&
      (previousEvaluation.status === "COMPLETED" ||
        previousEvaluation.status === "CONFIRMED");

    if (periodStatus === "CLOSED") {
      return {
        review: {
          completed: !!hasPreviousEvaluation,
          current: !!hasPreviousEvaluation,
        },
        goals: { completed: hasGoals, current: false },
        progress: { completed: true, current: false },
        "self-eval": {
          completed: isSelfEvalSubmitted,
          current: !hasPreviousEvaluation,
        },
      };
    }

    if (periodStatus === "REVIEW") {
      return {
        review: { completed: false, current: false },
        goals: { completed: hasGoals, current: false },
        progress: { completed: true, current: false },
        "self-eval": { completed: isSelfEvalSubmitted, current: true },
      };
    }

    // ACTIVE
    if (!hasGoals) {
      return {
        review: { completed: !!hasPreviousEvaluation, current: false },
        goals: { completed: false, current: true },
        progress: { completed: false, current: false },
        "self-eval": { completed: false, current: false },
      };
    }

    if (!isSelfEvalSubmitted) {
      return {
        review: { completed: !!hasPreviousEvaluation, current: false },
        goals: { completed: true, current: false },
        progress: { completed: false, current: true },
        "self-eval": { completed: false, current: false },
      };
    }

    // Self eval submitted
    return {
      review: { completed: !!hasPreviousEvaluation, current: false },
      goals: { completed: true, current: false },
      progress: { completed: true, current: false },
      "self-eval": { completed: true, current: true },
    };
  }, [
    periodStatus,
    goalData.hasGoals,
    goalData.selfEvaluationStatus,
    previousEvaluation,
  ]);

  // Determine which phase to expand by default
  const defaultExpandedPhase = useMemo((): PhaseId => {
    const phases: PhaseId[] = ["review", "goals", "progress", "self-eval"];
    for (const phase of phases) {
      if (phaseStatuses[phase].current) return phase;
    }
    return "goals";
  }, [phaseStatuses]);

  const [expandedPhase, setExpandedPhase] = useState<PhaseId | null>(
    defaultExpandedPhase,
  );
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const togglePhase = (phase: PhaseId) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  const phases: { id: PhaseId; label: string; description: string }[] = [
    {
      id: "review",
      label: t.phaseReview,
      description: t.phaseReviewDescription,
    },
    { id: "goals", label: t.phaseGoals, description: t.phaseGoalsDescription },
    {
      id: "progress",
      label: t.phaseProgress,
      description: t.phaseProgressDescription,
    },
    {
      id: "self-eval",
      label: t.phaseSelfEval,
      description: t.phaseSelfEvalDescription,
    },
  ];

  const getCategoryName = (cat: { name: string; nameEn?: string | null }) => {
    if (language === "en" && cat.nameEn) return cat.nameEn;
    return cat.name;
  };

  const renderPhaseContent = (phaseId: PhaseId) => {
    switch (phaseId) {
      case "review":
        return (
          <PreviousReviewSection
            language={language}
            evaluation={previousEvaluation}
            loading={previousEvaluationLoading}
          />
        );

      case "goals":
        return (
          <div className="space-y-4">
            {/* Process Goals */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  {gt.processGoals}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {gt.processGoalsDescription}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {goalData.goals.processGoals.map((process, index) => (
                  <div
                    key={process.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-medium text-muted-foreground w-20">
                          {gt.process} {index + 1}
                        </span>
                        {process.isDefault ? (
                          <span className="text-sm font-medium">
                            {gt.defaultProcess}
                          </span>
                        ) : (
                          <Input
                            value={process.name}
                            onChange={(e) =>
                              goalData.updateProcessGoal(
                                process.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder={gt.processName}
                            className="max-w-xs"
                          />
                        )}
                      </div>
                      {!process.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            goalData.removeProcessGoal(
                              process.id,
                              gt.cannotDelete,
                            )
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {gt.processGoalText}
                      </Label>
                      <Textarea
                        value={process.goalText}
                        onChange={(e) =>
                          goalData.updateProcessGoal(
                            process.id,
                            "goalText",
                            e.target.value,
                          )
                        }
                        placeholder={gt.processGoalPlaceholder}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => goalData.addProcessGoal(language)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {gt.addProcess}
                </Button>
              </CardContent>
            </Card>

            {/* Growth Goals */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  {gt.growthGoals}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {gt.growthGoalsDescription}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {goalData.growthCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {gt.noCategories}
                  </p>
                ) : (
                  <>
                    <div>
                      <Label>{gt.selectCategory}</Label>
                      <Select
                        value={goalData.goals.growthGoal?.categoryId || ""}
                        onValueChange={(v) =>
                          goalData.handleGrowthCategoryChange(v, language)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={gt.selectCategory} />
                        </SelectTrigger>
                        <SelectContent>
                          {goalData.growthCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {getCategoryName(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {goalData.goals.growthGoal && (
                      <div>
                        <Label>{gt.growthGoalText}</Label>
                        <Textarea
                          value={goalData.goals.growthGoal.goalText}
                          onChange={(e) =>
                            goalData.updateGrowthGoalText(e.target.value)
                          }
                          placeholder={gt.growthGoalPlaceholder}
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Save status */}
            <SaveStatusIndicator
              saveStatus={goalData.saveStatus}
              translations={gt}
            />
          </div>
        );

      case "progress":
        return (
          <div className="space-y-4">
            {goalData.period && (
              <EvaluationCalendar
                language={language}
                periodStartDate={goalData.period.startDate.split("T")[0]}
                periodEndDate={goalData.period.endDate.split("T")[0]}
                interviewDates={goalData.interviewDates}
                onInterviewDatesChange={goalData.setInterviewDates}
                selfEvaluationSubmittedAt={goalData.selfEvaluationSubmittedAt}
                selfEvaluationStatus={goalData.selfEvaluationStatus}
                canSubmitSelfEvaluation={false}
                onSubmitSelfEvaluation={() => {}}
                canEdit={goalData.canEditSelfEvaluation}
              />
            )}
            <SaveStatusIndicator
              saveStatus={goalData.saveStatus}
              translations={gt}
            />
          </div>
        );

      case "self-eval":
        return (
          <div className="space-y-4">
            {/* Self evaluation for process goals */}
            {goalData.goals.processGoals.map((process, index) => (
              <div key={process.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {gt.process} {index + 1}:
                  </span>
                  <span className="text-sm font-medium">{process.name}</span>
                </div>
                {process.goalText && (
                  <p className="text-sm text-muted-foreground">
                    {process.goalText}
                  </p>
                )}
                <div className="pt-2 border-t">
                  <Label className="text-sm text-muted-foreground">
                    {gt.selfEvaluationLabel}
                  </Label>
                  <div className="mt-1">
                    <StarRating
                      value={goalData.selfProcessScores[process.id] || null}
                      onChange={(value) => {
                        if (!goalData.canEditSelfEvaluation) return;
                        goalData.setSelfProcessScores((prev) => ({
                          ...prev,
                          [process.id]: value,
                        }));
                      }}
                      disabled={!goalData.canEditSelfEvaluation}
                      language={language}
                    />
                  </div>
                  {goalData.selfProcessScores[process.id] && (
                    <Textarea
                      value={goalData.selfProcessComments[process.id] || ""}
                      onChange={(e) => {
                        if (!goalData.canEditSelfEvaluation) return;
                        goalData.setSelfProcessComments((prev) => ({
                          ...prev,
                          [process.id]: e.target.value,
                        }));
                      }}
                      placeholder={gt.selfEvaluationCommentPlaceholder}
                      rows={2}
                      disabled={!goalData.canEditSelfEvaluation}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Self evaluation for growth goal */}
            {goalData.goals.growthGoal && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {gt.growthGoals}:
                  </span>
                  <span className="text-sm font-medium">
                    {goalData.goals.growthGoal.categoryName}
                  </span>
                </div>
                {goalData.goals.growthGoal.goalText && (
                  <p className="text-sm text-muted-foreground">
                    {goalData.goals.growthGoal.goalText}
                  </p>
                )}
                <div className="pt-2 border-t">
                  <Label className="text-sm text-muted-foreground">
                    {gt.selfEvaluationLabel}
                  </Label>
                  <div className="mt-1">
                    <StarRating
                      value={goalData.selfGrowthLevel}
                      onChange={(value) => {
                        if (!goalData.canEditSelfEvaluation) return;
                        goalData.setSelfGrowthLevel(value);
                        if (goalData.goals.growthGoal?.categoryId) {
                          goalData.setSelfGrowthCategoryId(
                            goalData.goals.growthGoal.categoryId,
                          );
                        }
                      }}
                      disabled={!goalData.canEditSelfEvaluation}
                      language={language}
                    />
                  </div>
                  {goalData.selfGrowthLevel && (
                    <Textarea
                      value={goalData.selfGrowthComment}
                      onChange={(e) => {
                        if (!goalData.canEditSelfEvaluation) return;
                        goalData.setSelfGrowthComment(e.target.value);
                      }}
                      placeholder={gt.selfEvaluationCommentPlaceholder}
                      rows={2}
                      disabled={!goalData.canEditSelfEvaluation}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Submit button */}
            {goalData.selfEvaluationStatus !== "SUBMITTED" &&
              goalData.canEditSelfEvaluation && (
                <Button
                  onClick={() =>
                    goalData.handleSubmitSelfEvaluation(
                      gt.submitConfirm,
                      gt.submitSuccess,
                      gt.submitError,
                    )
                  }
                  disabled={!goalData.canSubmitSelfEvaluation()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {gt.submitSelfEvaluation}
                </Button>
              )}

            {goalData.selfEvaluationStatus === "SUBMITTED" && (
              <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">
                  {language === "ja"
                    ? "自己評価提出済み"
                    : "Self Evaluation Submitted"}
                </span>
              </div>
            )}

            <SaveStatusIndicator
              saveStatus={goalData.saveStatus}
              translations={gt}
            />
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <div className="space-y-0">
        {phases.map((phase, index) => {
          const status = phaseStatuses[phase.id];
          const isExpanded = expandedPhase === phase.id;
          const isLast = index === phases.length - 1;

          return (
            <div key={phase.id} className="relative">
              {/* Timeline connector */}
              <div className="flex">
                {/* Left timeline */}
                <div className="flex flex-col items-center mr-4 w-8">
                  {/* Status icon */}
                  <button
                    type="button"
                    onClick={() => togglePhase(phase.id)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center relative shrink-0 transition-colors",
                      status.completed
                        ? "bg-green-500 text-white"
                        : status.current
                          ? "bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                          : "bg-muted border-2 border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {status.completed ? (
                      <Check className="w-4 h-4" />
                    ) : status.current ? (
                      <Circle className="w-3 h-3 fill-current" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </button>
                  {/* Vertical line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 flex-1 min-h-4",
                        status.completed
                          ? "bg-green-500"
                          : "bg-muted-foreground/20",
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                  {/* Phase header */}
                  <button
                    type="button"
                    onClick={() => togglePhase(phase.id)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base">{phase.label}</h3>
                        {status.completed && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            {t.phaseCompleted}
                          </span>
                        )}
                        {status.current && !status.completed && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {t.phaseCurrent}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {phase.description}
                      </p>
                    </div>
                    <div className="text-muted-foreground group-hover:text-foreground transition-colors pr-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {/* Phase content */}
                  {isExpanded && (
                    <div className="mt-4">
                      {goalData.loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {t.loading}
                        </div>
                      ) : (
                        renderPhaseContent(phase.id)
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Assistant (overlay) - only show for goals and self-eval phases */}
      {(expandedPhase === "goals" || expandedPhase === "self-eval") &&
        (showAIAssistant ? (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowAIAssistant(false)}
            />
            <div className="fixed right-0 top-0 h-full w-1/2 z-50 shadow-xl animate-in slide-in-from-right duration-300">
              <GoalAIAssistant
                language={language}
                goalsInfo={goalData.getGoalsInfo()}
                onToggleExpand={setShowAIAssistant}
              />
            </div>
          </>
        ) : (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAIAssistant(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-card hover:bg-accent"
              title={
                language === "ja" ? "AIアシスタントを開く" : "Open AI Assistant"
              }
            >
              <div className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </Button>
          </div>
        ))}
    </div>
  );
}

function SaveStatusIndicator({
  saveStatus,
  translations: gt,
}: {
  saveStatus: "idle" | "saving" | "saved" | "error";
  translations: {
    saving: string;
    saved: string;
    saveError: string;
    autoSave: string;
  };
}) {
  return (
    <div className="flex justify-end items-center gap-2 text-sm text-muted-foreground">
      {saveStatus === "saving" && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{gt.saving}</span>
        </>
      )}
      {saveStatus === "saved" && (
        <>
          <Cloud className="w-4 h-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">{gt.saved}</span>
        </>
      )}
      {saveStatus === "error" && (
        <>
          <CloudOff className="w-4 h-4 text-destructive" />
          <span className="text-destructive">{gt.saveError}</span>
        </>
      )}
      {saveStatus === "idle" && (
        <>
          <Cloud className="w-4 h-4" />
          <span>{gt.autoSave}</span>
        </>
      )}
    </div>
  );
}
