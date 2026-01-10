"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Target, TrendingUp, Plus, Trash2, Check, Loader2, Bot, ChevronLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { GoalAIAssistant } from "./GoalAIAssistant";

interface ProcessGoal {
  id: string;
  name: string;
  goalText: string;
  isDefault: boolean;
  order: number;
}

interface GrowthGoal {
  categoryId: string;
  categoryName: string;
  goalText: string;
}

interface GoalsData {
  processGoals: ProcessGoal[];
  growthGoal: GrowthGoal | null;
}

interface InterviewDate {
  id: string;
  date: string;
  note?: string;
}

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  coefficient: number;
}

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface GoalSettingSectionProps {
  language: "en" | "ja";
  periodId: string;
  period?: Period;
}

const translations = {
  en: {
    title: "Goal Setting",
    description: "Set your goals for this evaluation period",
    noPeriod: "No active evaluation period",
    processGoals: "Process Goals",
    processGoalsDescription: "Set goals for your work processes and projects",
    defaultProcess: "Regular Work",
    processName: "Process Name",
    processGoalText: "Goal Description",
    processGoalPlaceholder: "Describe what you want to achieve in this process...",
    addProcess: "Add Process",
    growthGoals: "Growth Goals",
    growthGoalsDescription: "Select a growth category and set your development goal",
    selectCategory: "Select Category",
    growthGoalText: "Growth Goal",
    growthGoalPlaceholder: "Describe your growth goal for this category...",
    selfReflection: "Self Reflection",
    selfReflectionDescription: "Optional: Write your thoughts or notes about your goals",
    selfReflectionPlaceholder: "Write any reflections or notes about your goals...",
    interviewDates: "Interview Dates",
    interviewDatesDescription: "Record your meetings with your evaluator (progress check, results discussion, goal setting)",
    addInterviewDate: "Add Interview Date",
    interviewNote: "Note (optional)",
    interviewNotePlaceholder: "e.g., Progress check, Goal setting...",
    evaluator: "Evaluator",
    evaluatorNotSet: "Not set",
    saving: "Saving...",
    saved: "Saved",
    saveError: "Failed to save goals",
    loading: "Loading...",
    cannotDelete: "Default process cannot be deleted",
    process: "Process",
    noCategories: "No growth categories available. Please contact the administrator.",
    aiAssistant: "AI Assistant",
  },
  ja: {
    title: "目標設定",
    description: "この評価期間の目標を設定してください",
    noPeriod: "有効な評価期間がありません",
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
    selfReflection: "自己ふり返り",
    selfReflectionDescription: "任意: 目標に対する考えやメモを記録",
    selfReflectionPlaceholder: "目標に対するふり返りやメモを記入してください...",
    interviewDates: "面談実施日",
    interviewDatesDescription: "評価者との面談日を記録（進捗確認、結果面談、目標設定など）",
    addInterviewDate: "面談日を追加",
    interviewNote: "メモ（任意）",
    interviewNotePlaceholder: "例：進捗確認、目標設定...",
    evaluator: "評価者",
    evaluatorNotSet: "未設定",
    saving: "保存中...",
    saved: "保存済み",
    saveError: "目標の保存に失敗しました",
    loading: "読み込み中...",
    cannotDelete: "デフォルトのプロセスは削除できません",
    process: "プロセス",
    noCategories: "成長カテゴリがありません。管理者にお問い合わせください。",
    aiAssistant: "AIアシスタント",
  },
};

export default function GoalSettingSection({
  language,
  periodId,
}: GoalSettingSectionProps) {
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [goals, setGoals] = useState<GoalsData>({
    processGoals: [
      {
        id: "default-1",
        name: language === "ja" ? "通常業務" : "Regular Work",
        goalText: "",
        isDefault: true,
        order: 1,
      },
    ],
    growthGoal: null,
  });
  const [selfReflection, setSelfReflection] = useState("");
  const [interviewDates, setInterviewDates] = useState<InterviewDate[]>([]);
  const [evaluator, setEvaluator] = useState<{ name: string } | null>(null);
  const [growthCategories, setGrowthCategories] = useState<GrowthCategory[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Auto-save refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchGoals = useCallback(async () => {
    if (!periodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluation/my-evaluation/goals?periodId=${periodId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.processGoals) {
          setGoals({
            processGoals: data.processGoals,
            growthGoal: data.growthGoal || null,
          });
        }
        if (data.selfReflection) {
          setSelfReflection(data.selfReflection);
        }
        if (data.interviewDates) {
          setInterviewDates(data.interviewDates);
        } else {
          setInterviewDates([]);
        }
        if (data.evaluator) {
          setEvaluator(data.evaluator);
        } else {
          setEvaluator(null);
        }
        if (data.growthCategories) {
          setGrowthCategories(data.growthCategories);
        }
        if (data.period) {
          setPeriod(data.period);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to fetch goals");
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
      setError("Failed to fetch goals");
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [periodId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Auto-save function
  const saveGoals = useCallback(async () => {
    if (!periodId || isInitialLoadRef.current) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/evaluation/my-evaluation/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          processGoals: goals.processGoals,
          growthGoal: goals.growthGoal,
          selfReflection: selfReflection || null,
          interviewDates: interviewDates,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        // 3秒後にsaved状態をリセット
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        toast.error(t.saveError);
        setSaveStatus("idle");
      }
    } catch {
      toast.error(t.saveError);
      setSaveStatus("idle");
    }
  }, [periodId, goals, selfReflection, interviewDates, t.saveError]);

  // Debounced auto-save effect
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;

    // 既存のタイマーをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 1.5秒後に保存
    saveTimeoutRef.current = setTimeout(() => {
      saveGoals();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [goals, selfReflection, interviewDates, saveGoals, loading]);

  const addProcessGoal = () => {
    const newOrder = goals.processGoals.length + 1;
    const newProcess: ProcessGoal = {
      id: `process-${Date.now()}`,
      name: `${t.process} ${newOrder}`,
      goalText: "",
      isDefault: false,
      order: newOrder,
    };
    setGoals({
      ...goals,
      processGoals: [...goals.processGoals, newProcess],
    });
  };

  const removeProcessGoal = (id: string) => {
    const process = goals.processGoals.find((p) => p.id === id);
    if (process?.isDefault) {
      toast.error(t.cannotDelete);
      return;
    }
    setGoals({
      ...goals,
      processGoals: goals.processGoals.filter((p) => p.id !== id),
    });
  };

  const updateProcessGoal = (id: string, field: "name" | "goalText", value: string) => {
    setGoals({
      ...goals,
      processGoals: goals.processGoals.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const getCategoryName = (cat: { name: string; nameEn?: string | null }) => {
    if (language === "en" && cat.nameEn) {
      return cat.nameEn;
    }
    return cat.name;
  };

  const handleGrowthCategoryChange = (categoryId: string) => {
    const category = growthCategories.find((c) => c.id === categoryId);
    if (category) {
      setGoals({
        ...goals,
        growthGoal: {
          categoryId: category.id,
          categoryName: getCategoryName(category),
          goalText: goals.growthGoal?.goalText || "",
        },
      });
    }
  };

  const updateGrowthGoalText = (goalText: string) => {
    if (goals.growthGoal) {
      setGoals({
        ...goals,
        growthGoal: {
          ...goals.growthGoal,
          goalText,
        },
      });
    }
  };

  const addInterviewDate = () => {
    const newDate: InterviewDate = {
      id: `interview-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      note: "",
    };
    setInterviewDates([...interviewDates, newDate]);
  };

  const removeInterviewDate = (id: string) => {
    setInterviewDates(interviewDates.filter((d) => d.id !== id));
  };

  const updateInterviewDate = (id: string, field: "date" | "note", value: string) => {
    setInterviewDates(
      interviewDates.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // 目標情報をAIアシスタントに渡すための文字列を生成
  const getGoalsInfo = () => {
    const parts: string[] = [];

    goals.processGoals.forEach((p, i) => {
      if (p.goalText) {
        parts.push(`プロセス${i + 1}（${p.name}）: ${p.goalText}`);
      }
    });

    if (goals.growthGoal?.goalText) {
      parts.push(`成長目標（${goals.growthGoal.categoryName}）: ${goals.growthGoal.goalText}`);
    }

    if (selfReflection) {
      parts.push(`自己ふり返り: ${selfReflection}`);
    }

    return parts.join("\n");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error === "No evaluation period available"
      ? t.noPeriod
      : error;
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Main Content */}
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with Save Status */}
          <div className="flex items-center justify-between">
            {/* Period Info */}
            {period && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{period.name}</span>
                <span>
                  ({new Date(period.startDate).toLocaleDateString(language)} - {new Date(period.endDate).toLocaleDateString(language)})
                </span>
              </div>
            )}

            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">{t.saving}</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{t.saved}</span>
                </>
              )}
            </div>
          </div>

          {/* Process Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                {t.processGoals}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t.processGoalsDescription}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.processGoals.map((process, index) => (
                <div key={process.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-muted-foreground w-20">
                        {t.process} {index + 1}
                      </span>
                      {process.isDefault ? (
                        <span className="text-sm font-medium">{t.defaultProcess}</span>
                      ) : (
                        <Input
                          value={process.name}
                          onChange={(e) => updateProcessGoal(process.id, "name", e.target.value)}
                          placeholder={t.processName}
                          className="max-w-xs"
                        />
                      )}
                    </div>
                    {!process.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProcessGoal(process.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t.processGoalText}</Label>
                    <Textarea
                      value={process.goalText}
                      onChange={(e) => updateProcessGoal(process.id, "goalText", e.target.value)}
                      placeholder={t.processGoalPlaceholder}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addProcessGoal} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {t.addProcess}
              </Button>
            </CardContent>
          </Card>

          {/* Growth Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                {t.growthGoals}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t.growthGoalsDescription}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {growthCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.noCategories}</p>
              ) : (
                <>
                  <div>
                    <Label>{t.selectCategory}</Label>
                    <Select
                      value={goals.growthGoal?.categoryId || ""}
                      onValueChange={handleGrowthCategoryChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {growthCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {getCategoryName(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {goals.growthGoal && (
                    <div>
                      <Label>{t.growthGoalText}</Label>
                      <Textarea
                        value={goals.growthGoal.goalText}
                        onChange={(e) => updateGrowthGoalText(e.target.value)}
                        placeholder={t.growthGoalPlaceholder}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Self Reflection */}
          <Card>
            <CardHeader>
              <CardTitle>{t.selfReflection}</CardTitle>
              <p className="text-sm text-muted-foreground">{t.selfReflectionDescription}</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={selfReflection}
                onChange={(e) => setSelfReflection(e.target.value)}
                placeholder={t.selfReflectionPlaceholder}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Interview Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                {t.interviewDates}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t.interviewDatesDescription}</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="text-muted-foreground">{t.evaluator}:</span>
                <span className="font-medium">
                  {evaluator?.name || t.evaluatorNotSet}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviewDates.map((interview) => (
                <div key={interview.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      type="date"
                      value={interview.date}
                      onChange={(e) => updateInterviewDate(interview.id, "date", e.target.value)}
                      className="max-w-xs"
                    />
                    <Input
                      type="text"
                      value={interview.note || ""}
                      onChange={(e) => updateInterviewDate(interview.id, "note", e.target.value)}
                      placeholder={t.interviewNotePlaceholder}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInterviewDate(interview.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={addInterviewDate} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {t.addInterviewDate}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AIアシスタント（オーバーレイ） */}
      {showAIAssistant ? (
        <>
          {/* オーバーレイ背景 */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowAIAssistant(false)}
          />
          {/* AIアシスタントパネル */}
          <div className="fixed right-0 top-0 h-full w-1/2 z-50 shadow-xl animate-in slide-in-from-right duration-300">
            <GoalAIAssistant
              language={language}
              goalsInfo={getGoalsInfo()}
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
            title={language === "ja" ? "AIアシスタントを開く" : "Open AI Assistant"}
          >
            <div className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              <Bot className="h-5 w-5 text-primary" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
