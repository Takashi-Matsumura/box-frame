"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Database,
  FileText,
  Trash2,
  Upload,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  File,
  Eye,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
}

interface EvaluationRagClientProps {
  language: "en" | "ja";
}

const translations = {
  ja: {
    title: "評価AIナレッジ",
    description: "AIアシスタントが参照するナレッジベースを管理します",
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
    documentContentPlaceholder: "ナレッジベースに登録する内容を入力してください...",
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
    viewContent: "内容を表示",
    hideContent: "内容を隠す",
    loading: "読み込み中...",
    uploadedAt: "登録日時",
    preview: "プレビュー",
    source: "ソース",
  },
  en: {
    title: "Evaluation AI Knowledge",
    description: "Manage the knowledge base referenced by the AI assistant",
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
    documentContentPlaceholder: "Enter the content to register in the knowledge base...",
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
    viewContent: "View content",
    hideContent: "Hide content",
    loading: "Loading...",
    uploadedAt: "Uploaded at",
    preview: "Preview",
    source: "Source",
  },
};

export default function EvaluationRagClient({ language }: EvaluationRagClientProps) {
  const t = translations[language];

  const [backendStatus, setBackendStatus] = useState<"unknown" | "healthy" | "unhealthy">("unknown");
  const [totalChunks, setTotalChunks] = useState(0);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Expanded document content
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("evaluation");
  const [content, setContent] = useState("");

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

  // Fetch documents list (grouped by filename)
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
    if (expandedDoc === filename) {
      setExpandedDoc(null);
      setDocContent(null);
      return;
    }

    setExpandedDoc(filename);
    setLoadingContent(true);
    setDocContent(null);

    try {
      const res = await fetch(`/api/rag-backend/documents/content/${encodeURIComponent(filename)}`);
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
        // Refresh data
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

  // Delete document (by filename - deletes all chunks)
  const handleDelete = async (filename: string) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingFilename(filename);
    setMessage(null);

    try {
      const res = await fetch(`/api/rag-backend/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: t.deleteSuccess });
        // Clear expanded content if deleted
        if (expandedDoc === filename) {
          setExpandedDoc(null);
          setDocContent(null);
        }
        // Refresh data
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

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "-";
    try {
      return new Date(timestamp).toLocaleString(language === "ja" ? "ja-JP" : "en-US");
    } catch {
      return timestamp;
    }
  };

  // Get display name from filename
  const getDisplayName = (filename: string) => {
    // Remove .md extension if present
    return filename.replace(/\.md$/, "");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{t.backendStatus}</span>
              </div>
              <Badge variant={backendStatus === "healthy" ? "default" : "destructive"}>
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
                <span className="text-sm font-medium">{t.documentCount}</span>
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
              disabled={backendStatus !== "healthy" || isRegistering || !content.trim()}
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
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
                  {/* Document Header */}
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
                        <p className="font-medium truncate">{getDisplayName(doc.filename)}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{doc.chunk_count} {t.chunkInfo}</span>
                          <span>{doc.total_chars.toLocaleString()} {t.totalChars}</span>
                          {doc.upload_timestamp && (
                            <span>{formatTimestamp(doc.upload_timestamp)}</span>
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

                  {/* Expanded Content */}
                  {expandedDoc === doc.filename && (
                    <div className="border-t bg-muted/30">
                      {loadingContent ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">{t.loading}</span>
                        </div>
                      ) : docContent ? (
                        <div>
                          {/* View Mode Toggle */}
                          <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
                            <Button
                              variant={viewMode === "preview" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setViewMode("preview")}
                              className="h-7 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {t.preview}
                            </Button>
                            <Button
                              variant={viewMode === "source" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setViewMode("source")}
                              className="h-7 text-xs"
                            >
                              <Code className="h-3 w-3 mr-1" />
                              {t.source}
                            </Button>
                          </div>

                          {/* Document Content */}
                          <div className="p-4 max-h-[500px] overflow-y-auto">
                            {(() => {
                              // Combine all chunks into a single document
                              const fullContent = docContent.chunks
                                .sort((a, b) => a.chunk_index - b.chunk_index)
                                .map((chunk) => chunk.content)
                                .join("\n\n");

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
                                          <p className="my-2 leading-relaxed text-sm">{children}</p>
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
                                          <li className="leading-relaxed">{children}</li>
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
                                          <em className="italic">{children}</em>
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
  );
}
