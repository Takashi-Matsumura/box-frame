"use client";

import { Camera, Loader2, Monitor, Sparkles, User, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import {
  ProcedureImageManager,
  type ProcedureImage,
} from "./ProcedureImageManager";

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
  images?: ProcedureImage[];
}

interface ProcedureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ExtractedTask;
  procedure: WorkProcedure | null;
  processId: string;
  jobDescriptionMd?: string | null;
  language: "en" | "ja";
  onSave: (procedureMd: string) => Promise<void>;
}

const placeholderTemplate = {
  en: `# Task Name

## Overview
Brief description of what this task accomplishes.

## Purpose
Why this task is necessary.

## Actor
Who performs this task.

## Prerequisites
- Condition 1
- Condition 2

## Main Flow
1. Step 1
2. Step 2
3. Step 3

## Alternative Flow
- Alternative pattern when...

## Exception Handling
- When an error occurs...

## Post-conditions
- State after completion

## Notes
- Additional information`,
  ja: `# 作業名

## 概要
この作業が何を達成するかの簡潔な説明。

## 目的
なぜこの作業が必要なのか。

## アクター
この作業を実行する担当者。

## 事前条件
- 条件1
- 条件2

## メインフロー
1. ステップ1
2. ステップ2
3. ステップ3

## 代替フロー
- ～の場合の代替パターン

## 例外処理
- エラー発生時の対応

## 事後条件
- 完了後の状態

## 備考
- 補足情報`,
};

const translations = {
  en: {
    editProcedure: "Edit Work Procedure",
    createProcedure: "Create Work Procedure",
    taskName: "Task Name",
    actor: "Actor",
    taskType: "Task Type",
    taskTypeManual: "Manual",
    taskTypeSystem: "System",
    markdown: "Markdown",
    preview: "Preview",
    images: "Images",
    generateWithAI: "Generate with AI",
    generating: "Generating...",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    noContent: "No content. Write or generate with AI.",
  },
  ja: {
    editProcedure: "作業手順書を編集",
    createProcedure: "作業手順書を作成",
    taskName: "作業名",
    actor: "アクター",
    taskType: "作業タイプ",
    taskTypeManual: "人手作業",
    taskTypeSystem: "システム処理",
    markdown: "マークダウン",
    preview: "プレビュー",
    images: "画像",
    generateWithAI: "AIで生成",
    generating: "生成中...",
    save: "保存",
    saving: "保存中...",
    cancel: "キャンセル",
    noContent: "コンテンツがありません。入力またはAIで生成してください。",
  },
};

export function ProcedureEditModal({
  isOpen,
  onClose,
  task,
  procedure,
  processId,
  jobDescriptionMd,
  language,
  onSave,
}: ProcedureEditModalProps) {
  const t = translations[language];
  const [content, setContent] = useState(procedure?.procedureMd || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"markdown" | "preview" | "images">(
    "markdown"
  );
  const [images, setImages] = useState<ProcedureImage[]>(
    procedure?.images || []
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerateWithAI = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/backoffice/processes/${processId}/procedures/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskName: task.name,
            taskType: task.type,
            actorName: task.actorName,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContent(data.procedureMd || "");
        setActiveTab("preview");
      }
    } catch (error) {
      console.error("Failed to generate procedure:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [processId, task]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertToMarkdown = useCallback((markdown: string) => {
    setContent((prev) => {
      // カーソル位置または末尾に挿入
      if (textareaRef.current) {
        const { selectionStart, selectionEnd } = textareaRef.current;
        const before = prev.substring(0, selectionStart);
        const after = prev.substring(selectionEnd);
        const newContent = `${before}\n\n${markdown}\n\n${after}`;
        // マークダウンタブに切り替え
        setActiveTab("markdown");
        return newContent;
      }
      // textareaが無い場合は末尾に追加
      return `${prev}\n\n${markdown}`;
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              {procedure ? t.editProcedure : t.createProcedure}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>
                <strong>{t.taskName}:</strong> {task.name}
              </span>
              {task.actorName && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {task.actorName}
                </span>
              )}
              <span className="flex items-center gap-1">
                {task.type === "system" ? (
                  <Monitor className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                {task.type === "system" ? t.taskTypeSystem : t.taskTypeManual}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor / Preview / Images */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "markdown"
                    ? "bg-background shadow"
                    : "hover:bg-background/50"
                }`}
                onClick={() => setActiveTab("markdown")}
              >
                {t.markdown}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "preview"
                    ? "bg-background shadow"
                    : "hover:bg-background/50"
                }`}
                onClick={() => setActiveTab("preview")}
              >
                {t.preview}
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "images"
                    ? "bg-background shadow"
                    : "hover:bg-background/50"
                }`}
                onClick={() => setActiveTab("images")}
              >
                <Camera className="w-3.5 h-3.5" />
                {t.images}
                {images.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                    {images.length}
                  </span>
                )}
              </button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateWithAI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? t.generating : t.generateWithAI}
              </Button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "markdown" && (
                <textarea
                  ref={textareaRef}
                  className="w-full h-full p-4 resize-none font-mono text-sm bg-background focus:outline-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={placeholderTemplate[language]}
                />
              )}
              {activeTab === "preview" && (
                <div className="h-full overflow-y-auto p-4">
                  {content ? (
                    <article
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(content, { async: false }) as string,
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {t.noContent}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "images" && procedure && (
                <div className="h-full p-4">
                  <ProcedureImageManager
                    procedureId={procedure.id}
                    images={images}
                    language={language}
                    onImagesChange={setImages}
                    onInsertToMarkdown={handleInsertToMarkdown}
                  />
                </div>
              )}
              {activeTab === "images" && !procedure && (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">
                    {language === "ja"
                      ? "画像を追加するには、まず手順書を保存してください。"
                      : "Save the procedure first to add images."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.saving}
              </>
            ) : (
              t.save
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
