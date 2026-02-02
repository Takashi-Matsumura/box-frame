"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface ProcessGoal {
  id: string;
  name: string;
  goalText: string;
  isDefault: boolean;
  order: number;
}

export interface GrowthGoal {
  categoryId: string;
  categoryName: string;
  goalText: string;
}

export interface GoalsData {
  processGoals: ProcessGoal[];
  growthGoal: GrowthGoal | null;
}

export interface InterviewDate {
  id: string;
  date: string;
  note?: string;
}

export interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  coefficient: number;
}

export interface ProcessCategory {
  id: string;
  name: string;
  nameEn: string | null;
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UseGoalDataReturn {
  loading: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  error: string | null;
  period: Period | null;
  goals: GoalsData;
  interviewDates: InterviewDate[];
  growthCategories: GrowthCategory[];
  processCategories: ProcessCategory[];
  selfProcessScores: Record<string, number>;
  selfProcessComments: Record<string, string>;
  selfGrowthCategoryId: string | null;
  selfGrowthLevel: number | null;
  selfGrowthComment: string;
  selfEvaluationStatus: "DRAFT" | "SUBMITTED";
  selfEvaluationSubmittedAt: Date | null;
  canEditSelfEvaluation: boolean;
  setGoals: (goals: GoalsData) => void;
  setInterviewDates: (dates: InterviewDate[]) => void;
  setSelfProcessScores: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  setSelfProcessComments: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setSelfGrowthCategoryId: (id: string | null) => void;
  setSelfGrowthLevel: (level: number | null) => void;
  setSelfGrowthComment: (comment: string) => void;
  addProcessGoal: (language: "en" | "ja") => void;
  removeProcessGoal: (id: string, errorMsg: string) => void;
  updateProcessGoal: (
    id: string,
    field: "name" | "goalText",
    value: string,
  ) => void;
  handleGrowthCategoryChange: (
    categoryId: string,
    language: "en" | "ja",
  ) => void;
  updateGrowthGoalText: (goalText: string) => void;
  canSubmitSelfEvaluation: () => boolean;
  handleSubmitSelfEvaluation: (
    confirmMsg: string,
    successMsg: string,
    errorMsg: string,
  ) => Promise<void>;
  getGoalsInfo: () => string;
  saveGoals: () => Promise<void>;
  hasGoals: boolean;
}

export function useGoalData(periodId: string): UseGoalDataReturn {
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [goals, setGoals] = useState<GoalsData>({
    processGoals: [
      {
        id: "default-1",
        name: "通常業務",
        goalText: "",
        isDefault: true,
        order: 1,
      },
    ],
    growthGoal: null,
  });
  const [interviewDates, setInterviewDates] = useState<InterviewDate[]>([]);
  const [growthCategories, setGrowthCategories] = useState<GrowthCategory[]>(
    [],
  );
  const [processCategories, setProcessCategories] = useState<ProcessCategory[]>(
    [],
  );

  // Self evaluation state
  const [selfProcessScores, setSelfProcessScores] = useState<
    Record<string, number>
  >({});
  const [selfProcessComments, setSelfProcessComments] = useState<
    Record<string, string>
  >({});
  const [selfGrowthCategoryId, setSelfGrowthCategoryId] = useState<
    string | null
  >(null);
  const [selfGrowthLevel, setSelfGrowthLevel] = useState<number | null>(null);
  const [selfGrowthComment, setSelfGrowthComment] = useState<string>("");
  const [selfEvaluationStatus, setSelfEvaluationStatus] = useState<
    "DRAFT" | "SUBMITTED"
  >("DRAFT");
  const [selfEvaluationSubmittedAt, setSelfEvaluationSubmittedAt] =
    useState<Date | null>(null);
  const [canEditSelfEvaluation, setCanEditSelfEvaluation] = useState(true);

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
      const res = await fetch(
        `/api/evaluation/my-evaluation/goals?periodId=${periodId}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.processGoals) {
          setGoals({
            processGoals: data.processGoals,
            growthGoal: data.growthGoal || null,
          });
        }
        if (data.interviewDates) {
          setInterviewDates(data.interviewDates);
        } else {
          setInterviewDates([]);
        }
        if (data.growthCategories) {
          setGrowthCategories(data.growthCategories);
        }
        if (data.processCategories) {
          setProcessCategories(data.processCategories);
        }
        if (data.period) {
          setPeriod(data.period);
        }
        // Self evaluation data
        if (data.selfEvaluation) {
          setSelfProcessScores(data.selfEvaluation.processScores || {});
          setSelfProcessComments(data.selfEvaluation.processComments || {});
          setSelfGrowthCategoryId(data.selfEvaluation.growthCategoryId);
          setSelfGrowthLevel(data.selfEvaluation.growthLevel);
          setSelfGrowthComment(data.selfEvaluation.growthComment || "");
          setSelfEvaluationStatus(data.selfEvaluation.status || "DRAFT");
          setSelfEvaluationSubmittedAt(
            data.selfEvaluation.submittedAt
              ? new Date(data.selfEvaluation.submittedAt)
              : null,
          );
        } else {
          setSelfProcessScores({});
          setSelfProcessComments({});
          setSelfGrowthCategoryId(null);
          setSelfGrowthLevel(null);
          setSelfGrowthComment("");
          setSelfEvaluationStatus("DRAFT");
          setSelfEvaluationSubmittedAt(null);
        }
        setCanEditSelfEvaluation(data.canEditSelfEvaluation ?? true);
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
          interviewDates: interviewDates,
          selfProcessScores:
            Object.keys(selfProcessScores).length > 0
              ? selfProcessScores
              : undefined,
          selfProcessComments:
            Object.keys(selfProcessComments).length > 0
              ? selfProcessComments
              : undefined,
          selfGrowthCategoryId: selfGrowthCategoryId,
          selfGrowthLevel: selfGrowthLevel,
          selfGrowthComment: selfGrowthComment || undefined,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 5000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    }
  }, [
    periodId,
    goals,
    interviewDates,
    selfProcessScores,
    selfProcessComments,
    selfGrowthCategoryId,
    selfGrowthLevel,
    selfGrowthComment,
  ]);

  // Debounced auto-save effect
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;
    if (!canEditSelfEvaluation && selfEvaluationStatus === "SUBMITTED") return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveGoals();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    goals,
    interviewDates,
    selfProcessScores,
    selfProcessComments,
    selfGrowthCategoryId,
    selfGrowthLevel,
    selfGrowthComment,
    saveGoals,
    loading,
    canEditSelfEvaluation,
    selfEvaluationStatus,
  ]);

  const addProcessGoal = useCallback(
    (language: "en" | "ja") => {
      const processLabel = language === "ja" ? "プロセス" : "Process";
      const newOrder = goals.processGoals.length + 1;
      const newProcess: ProcessGoal = {
        id: `process-${Date.now()}`,
        name: `${processLabel} ${newOrder}`,
        goalText: "",
        isDefault: false,
        order: newOrder,
      };
      setGoals({
        ...goals,
        processGoals: [...goals.processGoals, newProcess],
      });
    },
    [goals],
  );

  const removeProcessGoal = useCallback(
    (id: string, errorMsg: string) => {
      const process = goals.processGoals.find((p) => p.id === id);
      if (process?.isDefault) {
        toast.error(errorMsg);
        return;
      }
      setGoals({
        ...goals,
        processGoals: goals.processGoals.filter((p) => p.id !== id),
      });
    },
    [goals],
  );

  const updateProcessGoal = useCallback(
    (id: string, field: "name" | "goalText", value: string) => {
      setGoals((prev) => ({
        ...prev,
        processGoals: prev.processGoals.map((p) =>
          p.id === id ? { ...p, [field]: value } : p,
        ),
      }));
    },
    [],
  );

  const handleGrowthCategoryChange = useCallback(
    (categoryId: string, language: "en" | "ja") => {
      const category = growthCategories.find((c) => c.id === categoryId);
      if (category) {
        const name =
          language === "en" && category.nameEn
            ? category.nameEn
            : category.name;
        setGoals((prev) => ({
          ...prev,
          growthGoal: {
            categoryId: category.id,
            categoryName: name,
            goalText: prev.growthGoal?.goalText || "",
          },
        }));
      }
    },
    [growthCategories],
  );

  const updateGrowthGoalText = useCallback((goalText: string) => {
    setGoals((prev) => {
      if (!prev.growthGoal) return prev;
      return {
        ...prev,
        growthGoal: { ...prev.growthGoal, goalText },
      };
    });
  }, []);

  const canSubmitSelfEvaluation = useCallback(() => {
    const allProcessScoresEntered = goals.processGoals.every(
      (process) => selfProcessScores[process.id] !== undefined,
    );
    const growthEvaluationEntered =
      !goals.growthGoal || selfGrowthLevel !== null;
    return allProcessScoresEntered && growthEvaluationEntered;
  }, [goals, selfProcessScores, selfGrowthLevel]);

  const handleSubmitSelfEvaluation = useCallback(
    async (confirmMsg: string, successMsg: string, errorMsg: string) => {
      if (!canSubmitSelfEvaluation()) return;
      if (!confirm(confirmMsg)) return;

      setSaveStatus("saving");
      try {
        const res = await fetch("/api/evaluation/my-evaluation/goals/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodId,
            selfProcessScores,
            selfGrowthCategoryId,
            selfGrowthLevel,
          }),
        });

        if (res.ok) {
          setSelfEvaluationStatus("SUBMITTED");
          setSelfEvaluationSubmittedAt(new Date());
          setCanEditSelfEvaluation(false);
          toast.success(successMsg);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
        } else {
          toast.error(errorMsg);
          setSaveStatus("idle");
        }
      } catch {
        toast.error(errorMsg);
        setSaveStatus("idle");
      }
    },
    [
      canSubmitSelfEvaluation,
      periodId,
      selfProcessScores,
      selfGrowthCategoryId,
      selfGrowthLevel,
    ],
  );

  const getGoalsInfo = useCallback(() => {
    const parts: string[] = [];
    goals.processGoals.forEach((p, i) => {
      if (p.goalText) {
        parts.push(`プロセス${i + 1}（${p.name}）: ${p.goalText}`);
      }
    });
    if (goals.growthGoal?.goalText) {
      parts.push(
        `成長目標（${goals.growthGoal.categoryName}）: ${goals.growthGoal.goalText}`,
      );
    }
    return parts.join("\n");
  }, [goals]);

  // Determine if goals have been set
  const hasGoals =
    goals.processGoals.some((p) => p.goalText.trim() !== "") ||
    !!goals.growthGoal?.goalText;

  return {
    loading,
    saveStatus,
    error,
    period,
    goals,
    interviewDates,
    growthCategories,
    processCategories,
    selfProcessScores,
    selfProcessComments,
    selfGrowthCategoryId,
    selfGrowthLevel,
    selfGrowthComment,
    selfEvaluationStatus,
    selfEvaluationSubmittedAt,
    canEditSelfEvaluation,
    setGoals,
    setInterviewDates,
    setSelfProcessScores,
    setSelfProcessComments,
    setSelfGrowthCategoryId,
    setSelfGrowthLevel,
    setSelfGrowthComment,
    addProcessGoal,
    removeProcessGoal,
    updateProcessGoal,
    handleGrowthCategoryChange,
    updateGrowthGoalText,
    canSubmitSelfEvaluation,
    handleSubmitSelfEvaluation,
    getGoalsInfo,
    saveGoals,
    hasGoals,
  };
}
