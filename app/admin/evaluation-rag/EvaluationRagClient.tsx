"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Eye,
  File,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DocumentInfo {
  filename: string;
  file_type: string;
  chunk_count: number;
  upload_timestamp: string;
  total_chars: number;
}

interface DocumentContent {
  filename: string;
  total_chunks: number;
  chunks: {
    chunk_index: number;
    content: string;
    char_count: number;
  }[];
  original_content?: string;
}

interface EvaluationRagClientProps {
  language: "en" | "ja";
}

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = {
  ja: `あなたは人事評価の専門アシスタントです。評価者が適切な評価を行えるようサポートします。
回答は具体的かつ実践的なアドバイスを心がけてください。
- 評価のポイントや基準について説明できます
- フィードバックの書き方をアドバイスできます
- 成長目標の設定をサポートできます
回答は日本語で簡潔に行ってください。`,
  en: `You are a professional HR evaluation assistant. You help evaluators conduct appropriate evaluations.
Please provide specific and practical advice.
- You can explain evaluation points and criteria
- You can advise on how to write feedback
- You can support setting growth goals
Please respond in English concisely.`,
};

const STORAGE_KEY = "evaluation-ai-system-prompt";

const translations = {
  ja: {
    // Knowledge Base
    backendStatus: "バックエンド状態",
    healthy: "接続中",
    unhealthy: "未接続",
    documentCount: "登録ドキュメント数",
    documents: "件",
    chunks: "チャンク",
    addDocument: "ドキュメント追加",
    documentTitle: "タイトル",
    documentTitlePlaceholder: "評価ガイドライン",
    documentCategory: "カテゴリ",
    documentCategoryPlaceholder: "evaluation",
    documentContent: "内容",
    documentContentPlaceholder:
      "ナレッジベースに登録する内容を入力してください...",
    register: "登録",
    registering: "登録中...",
    registeredDocuments: "登録済みドキュメント",
    noDocuments: "ドキュメントが登録されていません",
    delete: "削除",
    deleting: "削除中...",
    refresh: "更新",
    success: "成功",
    error: "エラー",
    registerSuccess: "ドキュメントを登録しました",
    registerError: "ドキュメントの登録に失敗しました",
    deleteSuccess: "ドキュメントを削除しました",
    deleteError: "ドキュメントの削除に失敗しました",
    confirmDelete: "このドキュメントを削除してもよろしいですか？",
    characters: "文字",
    chunkInfo: "チャンクに分割",
    totalChars: "文字",
    loading: "読み込み中...",
    preview: "プレビュー",
    source: "ソース",
    edit: "編集",
    editing: "編集中",
    saveChanges: "変更を保存",
    savingChanges: "保存中...",
    cancelEdit: "キャンセル",
    updateSuccess: "ドキュメントを更新しました",
    updateError: "ドキュメントの更新に失敗しました",
    // System Prompt
    systemPromptTitle: "AIアシスタントのシステムプロンプト",
    systemPromptDescription:
      "AIアシスタントの動作や回答スタイルを定義するプロンプトです",
    systemPromptJa: "日本語プロンプト",
    systemPromptEn: "英語プロンプト",
    save: "保存",
    saving: "保存中...",
    saved: "保存しました",
    resetToDefault: "デフォルトに戻す",
    confirmReset: "システムプロンプトをデフォルトに戻しますか？",
    currentPrompt: "現在のプロンプト",
  },
  en: {
    // Knowledge Base
    backendStatus: "Backend Status",
    healthy: "Connected",
    unhealthy: "Disconnected",
    documentCount: "Registered Documents",
    documents: "docs",
    chunks: "chunks",
    addDocument: "Add Document",
    documentTitle: "Title",
    documentTitlePlaceholder: "Evaluation Guidelines",
    documentCategory: "Category",
    documentCategoryPlaceholder: "evaluation",
    documentContent: "Content",
    documentContentPlaceholder:
      "Enter the content to register in the knowledge base...",
    register: "Register",
    registering: "Registering...",
    registeredDocuments: "Registered Documents",
    noDocuments: "No documents registered",
    delete: "Delete",
    deleting: "Deleting...",
    refresh: "Refresh",
    success: "Success",
    error: "Error",
    registerSuccess: "Document registered successfully",
    registerError: "Failed to register document",
    deleteSuccess: "Document deleted successfully",
    deleteError: "Failed to delete document",
    confirmDelete: "Are you sure you want to delete this document?",
    characters: "characters",
    chunkInfo: "chunks",
    totalChars: "chars",
    loading: "Loading...",
    preview: "Preview",
    source: "Source",
    edit: "Edit",
    editing: "Editing",
    saveChanges: "Save Changes",
    savingChanges: "Saving...",
    cancelEdit: "Cancel",
    updateSuccess: "Document updated successfully",
    updateError: "Failed to update document",
    // System Prompt
    systemPromptTitle: "AI Assistant System Prompt",
    systemPromptDescription:
      "Define the behavior and response style of the AI assistant",
    systemPromptJa: "Japanese Prompt",
    systemPromptEn: "English Prompt",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    resetToDefault: "Reset to Default",
    confirmReset: "Reset the system prompt to default?",
    currentPrompt: "Current Prompt",
  },
};

export default function EvaluationRagClient({
  language,
}: EvaluationRagClientProps) {
  const t = translations[language];
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "knowledge-base";

  // Knowledge Base state
  const [backendStatus, setBackendStatus] = useState<
    "unknown" | "healthy" | "unhealthy"
  >("unknown");
  const [totalChunks, setTotalChunks] = useState(0);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("evaluation");
  const [content, setContent] = useState("");

  // System Prompt state
  const [systemPromptJa, setSystemPromptJa] = useState(
    DEFAULT_SYSTEM_PROMPT.ja,
  );
  const [systemPromptEn, setSystemPromptEn] = useState(
    DEFAULT_SYSTEM_PROMPT.en,
  );
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load system prompt from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ja) setSystemPromptJa(parsed.ja);
        if (parsed.en) setSystemPromptEn(parsed.en);
      } catch {
        // Ignore parse error
      }
    }
  }, []);

  // Fetch backend status and document count
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rag-backend/documents/count");
      if (res.ok) {
        const data = await res.json();
        setTotalChunks(data.total_chunks || 0);
        setBackendStatus("healthy");
      } else {
        setBackendStatus("unhealthy");
      }
    } catch {
      setBackendStatus("unhealthy");
    }
  }, []);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rag-backend/documents/list");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDocuments();
  }, [fetchStatus, fetchDocuments]);

  // Fetch document content
  const fetchDocumentContent = async (filename: string) => {
    // Reset editing state when switching documents
    setIsEditing(false);
    setEditedContent("");

    if (expandedDoc === filename) {
      setExpandedDoc(null);
      setDocContent(null);
      return;
    }

    setExpandedDoc(filename);
    setLoadingContent(true);
    setDocContent(null);
    setViewMode("preview");

    try {
      const res = await fetch(
        `/api/rag-backend/documents/content/${encodeURIComponent(filename)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDocContent(data);
      }
    } catch (error) {
      console.error("Failed to fetch document content:", error);
    } finally {
      setLoadingContent(false);
    }
  };

  // Register document
  const handleRegister = async () => {
    if (!content.trim()) return;

    setIsRegistering(true);
    setMessage(null);

    try {
      const res = await fetch("/api/rag-backend/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          metadata: {
            title: title.trim() || "Untitled",
            category: category.trim() || "general",
          },
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: t.registerSuccess });
        setTitle("");
        setContent("");
        await fetchStatus();
        await fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.detail || t.registerError });
      }
    } catch (error) {
      console.error("Failed to register document:", error);
      setMessage({ type: "error", text: t.registerError });
    } finally {
      setIsRegistering(false);
    }
  };

  // Delete document
  const handleDelete = async (filename: string) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingFilename(filename);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/rag-backend/documents/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        setMessage({ type: "success", text: t.deleteSuccess });
        if (expandedDoc === filename) {
          setExpandedDoc(null);
          setDocContent(null);
        }
        await fetchStatus();
        await fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.detail || t.deleteError });
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      setMessage({ type: "error", text: t.deleteError });
    } finally {
      setDeletingFilename(null);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    await fetchStatus();
    await fetchDocuments();
  };

  // Start editing document
  const handleStartEdit = () => {
    if (!docContent) return;
    // Use original_content if available (preserves formatting)
    const fullContent =
      docContent.original_content ||
      docContent.chunks
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map((chunk) => chunk.content)
        .join("\n");
    setEditedContent(fullContent);
    setIsEditing(true);
    setViewMode("source");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent("");
  };

  // Save edited document (delete old, create new)
  const handleSaveEdit = async () => {
    if (!expandedDoc || !editedContent.trim()) return;

    setIsSavingEdit(true);
    setMessage(null);

    try {
      // Get the document info to preserve metadata
      const docInfo = documents.find((d) => d.filename === expandedDoc);
      const docTitle = getDisplayName(expandedDoc);

      // First, delete the old document
      const deleteRes = await fetch(
        `/api/rag-backend/documents/${encodeURIComponent(expandedDoc)}`,
        {
          method: "DELETE",
        },
      );

      if (!deleteRes.ok) {
        throw new Error("Failed to delete old document");
      }

      // Determine category based on document title
      // 目標設定関連のドキュメントは "goalsetting"、それ以外は "evaluation"
      const docCategory = docTitle.includes("目標設定")
        ? "goalsetting"
        : "evaluation";

      // Then, create new document with edited content
      const createRes = await fetch("/api/rag-backend/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedContent.trim(),
          metadata: {
            title: docTitle,
            category: docCategory,
          },
        }),
      });

      if (createRes.ok) {
        setMessage({ type: "success", text: t.updateSuccess });
        setIsEditing(false);
        setEditedContent("");
        // Refresh and re-fetch content
        await fetchStatus();
        await fetchDocuments();
        // Re-fetch the document content
        setExpandedDoc(null);
        setTimeout(() => fetchDocumentContent(`${docTitle}.md`), 500);
      } else {
        const error = await createRes.json();
        setMessage({ type: "error", text: error.detail || t.updateError });
      }
    } catch (error) {
      console.error("Failed to update document:", error);
      setMessage({ type: "error", text: t.updateError });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Save system prompt
  const handleSavePrompt = () => {
    setIsSavingPrompt(true);
    setPromptMessage(null);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ja: systemPromptJa,
          en: systemPromptEn,
        }),
      );
      setPromptMessage({ type: "success", text: t.saved });
    } catch {
      setPromptMessage({ type: "error", text: t.error });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Reset system prompt
  const handleResetPrompt = () => {
    if (!confirm(t.confirmReset)) return;

    setSystemPromptJa(DEFAULT_SYSTEM_PROMPT.ja);
    setSystemPromptEn(DEFAULT_SYSTEM_PROMPT.en);
    localStorage.removeItem(STORAGE_KEY);
    setPromptMessage({ type: "success", text: t.saved });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "-";
    try {
      return new Date(timestamp).toLocaleString(
        language === "ja" ? "ja-JP" : "en-US",
      );
    } catch {
      return timestamp;
    }
  };

  // Get display name from filename
  const getDisplayName = (filename: string) => {
    return filename.replace(/\.md$/, "");
  };

  return (
    <div className="container mx-auto py-6 mt-8">
      {/* Knowledge Base Tab */}
      {activeTab === "knowledge-base" && (
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t.backendStatus}
                    </span>
                  </div>
                  <Badge
                    variant={
                      backendStatus === "healthy" ? "default" : "destructive"
                    }
                  >
                    {backendStatus === "healthy" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t.healthy}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {t.unhealthy}
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t.documentCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {documents.length} {t.documents}
                    </Badge>
                    <Badge variant="secondary">
                      {totalChunks} {t.chunks}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          {/* Add Document Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t.addDocument}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t.documentTitle}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.documentTitlePlaceholder}
                    disabled={backendStatus !== "healthy" || isRegistering}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t.documentCategory}</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={t.documentCategoryPlaceholder}
                    disabled={backendStatus !== "healthy" || isRegistering}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">{t.documentContent}</Label>
                  <span className="text-xs text-muted-foreground">
                    {content.length} {t.characters}
                  </span>
                </div>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.documentContentPlaceholder}
                  rows={6}
                  disabled={backendStatus !== "healthy" || isRegistering}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleRegister}
                  disabled={
                    backendStatus !== "healthy" ||
                    isRegistering ||
                    !content.trim()
                  }
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.registering}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t.register}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t.registeredDocuments}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {t.refresh}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>{t.noDocuments}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.filename}
                      className="rounded-lg border bg-card overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between gap-4">
                        <button
                          onClick={() => fetchDocumentContent(doc.filename)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 -m-2 p-2 rounded-lg transition-colors"
                        >
                          <div className="shrink-0">
                            {expandedDoc === doc.filename ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <File className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {getDisplayName(doc.filename)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>
                                {doc.chunk_count} {t.chunkInfo}
                              </span>
                              <span>
                                {doc.total_chars.toLocaleString()}{" "}
                                {t.totalChars}
                              </span>
                              {doc.upload_timestamp && (
                                <span>
                                  {formatTimestamp(doc.upload_timestamp)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.filename)}
                          disabled={deletingFilename === doc.filename}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          {deletingFilename === doc.filename ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {expandedDoc === doc.filename && (
                        <div className="border-t bg-muted/30">
                          {loadingContent ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">
                                {t.loading}
                              </span>
                            </div>
                          ) : docContent ? (
                            <div>
                              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={
                                      viewMode === "preview" && !isEditing
                                        ? "default"
                                        : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      setViewMode("preview");
                                      setIsEditing(false);
                                    }}
                                    className="h-7 text-xs"
                                    disabled={isEditing && isSavingEdit}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    {t.preview}
                                  </Button>
                                  <Button
                                    variant={
                                      viewMode === "source" && !isEditing
                                        ? "default"
                                        : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      setViewMode("source");
                                      setIsEditing(false);
                                    }}
                                    className="h-7 text-xs"
                                    disabled={isEditing && isSavingEdit}
                                  >
                                    <Code className="h-3 w-3 mr-1" />
                                    {t.source}
                                  </Button>
                                  {!isEditing && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleStartEdit}
                                      className="h-7 text-xs"
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      {t.edit}
                                    </Button>
                                  )}
                                  {isEditing && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      {t.editing}
                                    </Badge>
                                  )}
                                </div>
                                {isEditing && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      disabled={isSavingEdit}
                                      className="h-7 text-xs"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {t.cancelEdit}
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={
                                        isSavingEdit || !editedContent.trim()
                                      }
                                      className="h-7 text-xs"
                                    >
                                      {isSavingEdit ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          {t.savingChanges}
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-3 w-3 mr-1" />
                                          {t.saveChanges}
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="p-4 max-h-[500px] overflow-y-auto">
                                {(() => {
                                  // Use original_content if available (preserves formatting)
                                  const fullContent =
                                    docContent.original_content ||
                                    docContent.chunks
                                      .sort(
                                        (a, b) => a.chunk_index - b.chunk_index,
                                      )
                                      .map((chunk) => chunk.content)
                                      .join("\n");

                                  // 編集モードの場合はテキストエリアを表示
                                  if (isEditing) {
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>
                                            {editedContent.length}{" "}
                                            {t.characters}
                                          </span>
                                        </div>
                                        <Textarea
                                          value={editedContent}
                                          onChange={(e) =>
                                            setEditedContent(e.target.value)
                                          }
                                          className="font-mono text-xs leading-relaxed min-h-[400px] resize-y"
                                          disabled={isSavingEdit}
                                        />
                                      </div>
                                    );
                                  }

                                  if (viewMode === "source") {
                                    return (
                                      <pre className="bg-background rounded-lg p-4 border whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                        {fullContent}
                                      </pre>
                                    );
                                  }

                                  return (
                                    <div className="bg-background rounded-lg p-4 border">
                                      <div className="markdown-preview">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                            p: ({ children }) => (
                                              <p className="my-2 leading-relaxed text-sm">
                                                {children}
                                              </p>
                                            ),
                                            ul: ({ children }) => (
                                              <ul className="my-2 ml-4 list-disc space-y-1 text-sm">
                                                {children}
                                              </ul>
                                            ),
                                            ol: ({ children }) => (
                                              <ol className="my-2 ml-4 list-decimal space-y-1 text-sm">
                                                {children}
                                              </ol>
                                            ),
                                            li: ({ children }) => (
                                              <li className="leading-relaxed">
                                                {children}
                                              </li>
                                            ),
                                            h1: ({ children }) => (
                                              <h1 className="text-xl font-bold my-4 pb-2 border-b">
                                                {children}
                                              </h1>
                                            ),
                                            h2: ({ children }) => (
                                              <h2 className="text-lg font-bold my-3 pb-1 border-b">
                                                {children}
                                              </h2>
                                            ),
                                            h3: ({ children }) => (
                                              <h3 className="text-base font-bold my-2">
                                                {children}
                                              </h3>
                                            ),
                                            h4: ({ children }) => (
                                              <h4 className="text-sm font-bold my-2">
                                                {children}
                                              </h4>
                                            ),
                                            strong: ({ children }) => (
                                              <strong className="font-semibold">
                                                {children}
                                              </strong>
                                            ),
                                            em: ({ children }) => (
                                              <em className="italic">
                                                {children}
                                              </em>
                                            ),
                                            code: ({ children }) => (
                                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                                {children}
                                              </code>
                                            ),
                                            pre: ({ children }) => (
                                              <pre className="bg-muted p-3 rounded my-3 overflow-x-auto text-xs">
                                                {children}
                                              </pre>
                                            ),
                                            blockquote: ({ children }) => (
                                              <blockquote className="border-l-4 border-primary/50 pl-4 my-3 italic text-muted-foreground">
                                                {children}
                                              </blockquote>
                                            ),
                                            hr: () => (
                                              <hr className="my-4 border-border" />
                                            ),
                                            a: ({ href, children }) => (
                                              <a
                                                href={href}
                                                className="text-primary hover:underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                {children}
                                              </a>
                                            ),
                                            table: ({ children }) => (
                                              <div className="my-3 overflow-x-auto">
                                                <table className="min-w-full border-collapse border border-border text-sm">
                                                  {children}
                                                </table>
                                              </div>
                                            ),
                                            thead: ({ children }) => (
                                              <thead className="bg-muted/50">
                                                {children}
                                              </thead>
                                            ),
                                            tbody: ({ children }) => (
                                              <tbody>{children}</tbody>
                                            ),
                                            tr: ({ children }) => (
                                              <tr className="border-b border-border">
                                                {children}
                                              </tr>
                                            ),
                                            th: ({ children }) => (
                                              <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
                                                {children}
                                              </th>
                                            ),
                                            td: ({ children }) => (
                                              <td className="border border-border px-3 py-2">
                                                {children}
                                              </td>
                                            ),
                                          }}
                                        >
                                          {fullContent}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Prompt Tab */}
      {activeTab === "system-prompt" && (
        <div className="space-y-6">
          {/* Message */}
          {promptMessage && (
            <div
              className={`p-4 rounded-lg flex items-center gap-2 ${
                promptMessage.type === "success"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {promptMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {promptMessage.text}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t.systemPromptTitle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t.systemPromptDescription}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Japanese Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt-ja">{t.systemPromptJa}</Label>
                <Textarea
                  id="prompt-ja"
                  value={systemPromptJa}
                  onChange={(e) => setSystemPromptJa(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {/* English Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt-en">{t.systemPromptEn}</Label>
                <Textarea
                  id="prompt-en"
                  value={systemPromptEn}
                  onChange={(e) => setSystemPromptEn(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleResetPrompt}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.resetToDefault}
                </Button>
                <Button onClick={handleSavePrompt} disabled={isSavingPrompt}>
                  {isSavingPrompt ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.saving}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t.save}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
