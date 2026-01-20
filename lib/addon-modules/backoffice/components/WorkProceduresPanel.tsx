"use client";

import { ClipboardList, Loader2, RefreshCw, Sparkles, User, Monitor, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CollapsiblePanel,
  CollapsiblePanelContent,
  CollapsiblePanelDescription,
  CollapsiblePanelHeader,
  CollapsiblePanelSummary,
  CollapsiblePanelTitle,
} from "@/components/ui/collapsible-panel";
import { ProcedureEditModal } from "./ProcedureEditModal";

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

interface Translations {
  workProcedures: string;
  extractTasks: string;
  reExtractTasks: string;
  procedureCreated: string;
  procedureNotCreated: string;
  editProcedure: string;
  createProcedure: string;
  generateWithAI: string;
  taskTypeManual: string;
  taskTypeSystem: string;
  noTasks: string;
  noDiagram: string;
  extracting: string;
  tasksExtracted: string;
  createdCount: string;
}

interface WorkProceduresPanelProps {
  processId: string;
  hasDiagram: boolean;
  language: "en" | "ja";
  t: Translations;
  jobDescriptionMd?: string | null;
}

export function WorkProceduresPanel({
  processId,
  hasDiagram,
  language,
  t,
  jobDescriptionMd,
}: WorkProceduresPanelProps) {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [procedures, setProcedures] = useState<WorkProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    if (hasDiagram) {
      setIsLoading(true);
      Promise.all([extractTasks(), fetchProcedures()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [hasDiagram, extractTasks, fetchProcedures]);

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

  if (!hasDiagram) {
    return (
      <CollapsiblePanel defaultOpen={false}>
        <CollapsiblePanelHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            <CollapsiblePanelTitle>{t.workProcedures}</CollapsiblePanelTitle>
          </div>
          <CollapsiblePanelDescription>{t.noDiagram}</CollapsiblePanelDescription>
        </CollapsiblePanelHeader>
        <CollapsiblePanelContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t.noDiagram}</p>
          </div>
        </CollapsiblePanelContent>
      </CollapsiblePanel>
    );
  }

  return (
    <>
      <CollapsiblePanel defaultOpen={true}>
        <CollapsiblePanelHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            <CollapsiblePanelTitle>{t.workProcedures}</CollapsiblePanelTitle>
            {tasks.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({createdCount}/{tasks.length} {t.createdCount})
              </span>
            )}
          </div>
        </CollapsiblePanelHeader>

        <CollapsiblePanelSummary>
          <div className="flex items-center gap-4 px-6 pb-4">
            <span className="text-sm text-muted-foreground">
              {tasks.length > 0
                ? `${createdCount}/${tasks.length} ${t.createdCount}`
                : t.noTasks}
            </span>
          </div>
        </CollapsiblePanelSummary>

        <CollapsiblePanelContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={extractTasks}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isExtracting ? t.extracting : t.reExtractTasks}
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t.noTasks}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task, index) => {
                    const procedure = getProcedureForTask(task.cellId);
                    const hasContent = !!procedure?.procedureMd;

                    return (
                      <div
                        key={task.cellId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
                            {index + 1}.
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{task.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
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
          )}
        </CollapsiblePanelContent>
      </CollapsiblePanel>

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
    </>
  );
}
