"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseModal } from "@/components/modals/BaseModal";
import { aiAnalyticsTranslations } from "./translations";

interface JobAnalysis {
  id: string;
  title: string;
  description: string | null;
  status: string;
  tags: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AiAnalyticsClientProps {
  language: "en" | "ja";
  userName: string;
}

type AnalysisStatus = "DRAFT" | "GENERATING" | "EDITING" | "COMPLETED";

const statusColors: Record<AnalysisStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  GENERATING:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  EDITING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export function AiAnalyticsClient({
  language,
  userName,
}: AiAnalyticsClientProps) {
  const t = aiAnalyticsTranslations[language];
  const router = useRouter();

  const [analyses, setAnalyses] = useState<JobAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newInputMaterials, setNewInputMaterials] = useState("");
  const [newTags, setNewTags] = useState("");

  const fetchAnalyses = useCallback(async () => {
    try {
      const response = await fetch("/api/backoffice/job-analyses");
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data);
      }
    } catch (error) {
      console.error("Failed to fetch job analyses:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: t.draft,
      GENERATING: t.generating,
      EDITING: t.editing,
      COMPLETED: t.completed,
    };
    return statusMap[status] || status;
  };

  const handleCreateAnalysis = async () => {
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/backoffice/job-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          inputMaterials: newInputMaterials.trim() || null,
          tags: newTags.trim() || null,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setIsCreateModalOpen(false);
        setNewTitle("");
        setNewDescription("");
        setNewInputMaterials("");
        setNewTags("");
        router.push(`/backoffice/ai-analytics/${created.id}`);
      }
    } catch (error) {
      console.error("Failed to create job analysis:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (
      !confirm(
        language === "ja"
          ? "この業務分析を削除してもよろしいですか？"
          : "Are you sure you want to delete this analysis?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/backoffice/job-analyses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAnalyses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete job analysis:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t.welcomeTitle}</h1>
            <p className="text-indigo-100">{t.welcomeMessage}</p>
            <p className="mt-2 text-sm text-indigo-200">
              {language === "ja" ? `ユーザー: ${userName}` : `User: ${userName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Analysis List */}
      <div className="bg-card rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t.analysisList}</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t.newAnalysis}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">
              {t.noAnalyses}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {t.noAnalysesDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      className="font-medium truncate hover:text-primary cursor-pointer text-left"
                      onClick={() =>
                        router.push(`/backoffice/ai-analytics/${analysis.id}`)
                      }
                    >
                      {analysis.title}
                    </button>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColors[analysis.status as AnalysisStatus] || statusColors.DRAFT}`}
                    >
                      {getStatusLabel(analysis.status)}
                    </span>
                  </div>
                  {analysis.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {analysis.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      {t.version} {analysis.version}
                    </span>
                    <span>
                      {t.lastUpdated}: {formatDate(analysis.updatedAt)}
                    </span>
                    {analysis.tags && (
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {analysis.tags}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/backoffice/ai-analytics/${analysis.id}`)
                    }
                    className="border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">
                      {t.openDetail}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Analysis Modal */}
      <BaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t.createAnalysis}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.analysisTitle} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t.analysisTitlePlaceholder}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.analysisDescription}
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t.analysisDescriptionPlaceholder}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.inputMaterials}
            </label>
            <textarea
              value={newInputMaterials}
              onChange={(e) => setNewInputMaterials(e.target.value)}
              placeholder={t.inputMaterialsPlaceholder}
              rows={8}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.analysisTags}
            </label>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder={t.analysisTagsPlaceholder}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateAnalysis}
              disabled={!newTitle.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t.creating}
                </>
              ) : (
                t.create
              )}
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
