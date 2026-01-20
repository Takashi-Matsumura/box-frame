"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseModal } from "@/components/modals/BaseModal";
import { businessAnalyticsTranslations } from "./translations";

interface BusinessProcess {
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

interface BusinessAnalyticsClientProps {
  language: "en" | "ja";
  userName: string;
}

type ProcessStatus =
  | "DRAFT"
  | "INTERVIEW"
  | "DIAGRAMMING"
  | "REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

const statusColors: Record<ProcessStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  DIAGRAMMING:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  REVIEW:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  PUBLISHED:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function BusinessAnalyticsClient({
  language,
  userName,
}: BusinessAnalyticsClientProps) {
  const t = businessAnalyticsTranslations[language];
  const router = useRouter();

  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProcessTitle, setNewProcessTitle] = useState("");
  const [newProcessDescription, setNewProcessDescription] = useState("");
  const [newProcessTags, setNewProcessTags] = useState("");

  const fetchProcesses = useCallback(async () => {
    try {
      const response = await fetch("/api/backoffice/processes");
      if (response.ok) {
        const data = await response.json();
        setProcesses(data);
      }
    } catch (error) {
      console.error("Failed to fetch processes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: t.draft,
      INTERVIEW: t.interview,
      DIAGRAMMING: t.diagramming,
      REVIEW: t.review,
      PUBLISHED: t.published,
      ARCHIVED: t.archived,
    };
    return statusMap[status] || status;
  };

  const handleCreateProcess = async () => {
    if (!newProcessTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/backoffice/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProcessTitle.trim(),
          description: newProcessDescription.trim() || null,
          tags: newProcessTags.trim() || null,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setProcesses((prev) => [created, ...prev]);
        setIsCreateModalOpen(false);
        setNewProcessTitle("");
        setNewProcessDescription("");
        setNewProcessTags("");
        // Navigate to the hearing page
        router.push(`/backoffice/analytics/${created.id}`);
      }
    } catch (error) {
      console.error("Failed to create process:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (
      !confirm(
        language === "ja"
          ? "このプロセスを削除してもよろしいですか？"
          : "Are you sure you want to delete this process?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/backoffice/processes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProcesses((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete process:", error);
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
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t.welcomeTitle}</h1>
            <p className="text-amber-100">{t.welcomeMessage}</p>
            <p className="mt-2 text-sm text-amber-200">
              {language === "ja" ? `ユーザー: ${userName}` : `User: ${userName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="bg-card rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t.processList}</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t.newProcess}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : processes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">{t.noProcesses}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {t.noProcessesDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {processes.map((process) => (
              <div
                key={process.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      className="font-medium truncate hover:text-primary cursor-pointer text-left"
                      onClick={() =>
                        router.push(`/backoffice/analytics/${process.id}`)
                      }
                    >
                      {process.title}
                    </button>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColors[process.status as ProcessStatus] || statusColors.DRAFT}`}
                    >
                      {getStatusLabel(process.status)}
                    </span>
                  </div>
                  {process.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {process.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      {t.version} {process.version}
                    </span>
                    <span>
                      {t.lastUpdated}: {formatDate(process.updatedAt)}
                    </span>
                    {process.tags && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {process.tags}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {process.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/backoffice/analytics/${process.id}/procedures`)
                      }
                      className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span className="ml-1 hidden sm:inline">
                        {t.workProcedures}
                      </span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(`/backoffice/analytics/${process.id}`)
                    }
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">
                      {t.startHearing}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProcess(process.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Process Modal */}
      <BaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t.createProcess}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.processTitle} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newProcessTitle}
              onChange={(e) => setNewProcessTitle(e.target.value)}
              placeholder={t.processTitlePlaceholder}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.processDescription}
            </label>
            <textarea
              value={newProcessDescription}
              onChange={(e) => setNewProcessDescription(e.target.value)}
              placeholder={t.processDescriptionPlaceholder}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.processTags}
            </label>
            <input
              type="text"
              value={newProcessTags}
              onChange={(e) => setNewProcessTags(e.target.value)}
              placeholder={t.processTagsPlaceholder}
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
              onClick={handleCreateProcess}
              disabled={!newProcessTitle.trim() || isCreating}
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
