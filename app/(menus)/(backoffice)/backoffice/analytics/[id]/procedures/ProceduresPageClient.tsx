"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Monitor,
  RefreshCw,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DrawIoEmbed } from "react-drawio";
import { Button } from "@/components/ui/button";
import { ProcedureEditModal } from "@/lib/addon-modules/backoffice/components/ProcedureEditModal";
import { wrapWithMxFile } from "@/lib/addon-modules/backoffice/utils/diagram-utils";

interface ExtractedTask {
  cellId: string;
  name: string;
  type: "manual" | "system";
  swimlaneId: string | null;
  actorName: string | null;
  position: { x: number; y: number };
}

interface WorkProcedure {
  id: string;
  businessProcessId: string;
  diagramCellId: string;
  swimlaneId: string | null;
  taskName: string;
  taskType: string;
  actorName: string | null;
  procedureMd: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProceduresPageClientProps {
  processId: string;
  processTitle: string;
  diagramXml: string;
  jobDescriptionMd: string | null;
  language: "en" | "ja";
}

const translations = {
  en: {
    backToList: "Back to List",
    workProcedures: "Work Procedures",
    reExtractTasks: "Re-extract",
    extracting: "Extracting...",
    procedureCreated: "Created",
    procedureNotCreated: "Not Created",
    editProcedure: "Edit",
    createProcedure: "Create",
    generateWithAI: "AI Generate",
    taskTypeManual: "Manual",
    taskTypeSystem: "System",
    noTasks: "No tasks found",
    createdCount: "created",
    businessFlowDiagram: "Business Flow Diagram",
    taskList: "Task List",
  },
  ja: {
    backToList: "一覧に戻る",
    workProcedures: "作業手順書",
    reExtractTasks: "再抽出",
    extracting: "抽出中...",
    procedureCreated: "作成済み",
    procedureNotCreated: "未作成",
    editProcedure: "編集",
    createProcedure: "作成",
    generateWithAI: "AI生成",
    taskTypeManual: "人手作業",
    taskTypeSystem: "システム処理",
    noTasks: "作業が見つかりません",
    createdCount: "件作成済み",
    businessFlowDiagram: "業務フロー図",
    taskList: "作業一覧",
  },
};

export function ProceduresPageClient({
  processId,
  processTitle,
  diagramXml,
  jobDescriptionMd,
  language,
}: ProceduresPageClientProps) {
  const t = translations[language];
  const router = useRouter();

  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [procedures, setProcedures] = useState<WorkProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ExtractedTask | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<WorkProcedure | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProcedures = useCallback(async () => {
    try {
      const response = await fetch(`/api/backoffice/processes/${processId}/procedures`);
      if (response.ok) {
        const data = await response.json();
        setProcedures(data.procedures || []);
      }
    } catch (error) {
      console.error("Failed to fetch procedures:", error);
    }
  }, [processId]);

  const extractTasks = useCallback(async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`/api/backoffice/processes/${processId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to extract tasks:", error);
    } finally {
      setIsExtracting(false);
    }
  }, [processId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([extractTasks(), fetchProcedures()]).finally(() => {
      setIsLoading(false);
    });
  }, [extractTasks, fetchProcedures]);

  const handleOpenModal = (task: ExtractedTask) => {
    setSelectedTask(task);
    const existingProcedure = procedures.find(
      (p) => p.diagramCellId === task.cellId
    );
    setSelectedProcedure(existingProcedure || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setSelectedProcedure(null);
  };

  const handleSaveProcedure = async (procedureMd: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`/api/backoffice/processes/${processId}/procedures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagramCellId: selectedTask.cellId,
          taskName: selectedTask.name,
          taskType: selectedTask.type,
          actorName: selectedTask.actorName,
          swimlaneId: selectedTask.swimlaneId,
          procedureMd,
          sortOrder: tasks.findIndex((t) => t.cellId === selectedTask.cellId),
        }),
      });

      if (response.ok) {
        await fetchProcedures();
        handleCloseModal();
      }
    } catch (error) {
      console.error("Failed to save procedure:", error);
    }
  };

  const getProcedureForTask = (cellId: string): WorkProcedure | undefined => {
    return procedures.find((p) => p.diagramCellId === cellId);
  };

  const createdCount = procedures.filter((p) => p.procedureMd).length;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/backoffice/analytics")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t.backToList}
          </Button>
          <div>
            <h1 className="text-xl font-bold">{processTitle}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              {t.workProcedures}
              {tasks.length > 0 && (
                <span className="text-amber-600">
                  ({createdCount}/{tasks.length} {t.createdCount})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Business Flow Diagram */}
        <div className="w-1/2 flex flex-col border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <div className="px-4 py-2 border-b bg-muted/30">
            <h2 className="font-medium text-sm">{t.businessFlowDiagram}</h2>
          </div>
          <div className="flex-1">
            <DrawIoEmbed
              xml={wrapWithMxFile(diagramXml)}
              urlParameters={{
                ui: "min",
                spin: true,
                libraries: false,
                chrome: 0,
                toolbar: 0,
                lightbox: 1,
                nav: 1,
                layers: 1,
              }}
            />
          </div>
        </div>

        {/* Right: Task List */}
        <div className="w-1/2 flex flex-col border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-medium text-sm">{t.taskList}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={extractTasks}
              disabled={isExtracting}
              className="h-7 text-xs"
            >
              {isExtracting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              {isExtracting ? t.extracting : t.reExtractTasks}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t.noTasks}</p>
              </div>
            ) : (
              <div className="divide-y">
                {tasks.map((task, index) => {
                  const procedure = getProcedureForTask(task.cellId);
                  const hasContent = !!procedure?.procedureMd;

                  return (
                    <div
                      key={task.cellId}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
                          {index + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                            {task.actorName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.actorName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              {task.type === "system" ? (
                                <Monitor className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              {task.type === "system"
                                ? t.taskTypeSystem
                                : t.taskTypeManual}
                            </span>
                            {hasContent ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                {t.procedureCreated}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                {t.procedureNotCreated}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <Button
                          variant={hasContent ? "outline" : "primary"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleOpenModal(task)}
                        >
                          {hasContent ? t.editProcedure : t.createProcedure}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && selectedTask && (
        <ProcedureEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
          procedure={selectedProcedure}
          processId={processId}
          jobDescriptionMd={jobDescriptionMd}
          language={language}
          onSave={handleSaveProcedure}
        />
      )}
    </div>
  );
}
