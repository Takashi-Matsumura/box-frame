"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Document {
  id: string;
  content: string;
  metadata: Record<string, string>;
  created_at?: string;
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
    preview: "プレビュー",
    characters: "文字",
  },
  en: {
    title: "Evaluation AI Knowledge",
    description: "Manage the knowledge base referenced by the AI assistant",
    backendStatus: "Backend Status",
    healthy: "Connected",
    unhealthy: "Disconnected",
    documentCount: "Registered Documents",
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
    preview: "Preview",
    characters: "characters",
  },
};

export default function EvaluationRagClient({ language }: EvaluationRagClientProps) {
  const t = translations[language];

  const [backendStatus, setBackendStatus] = useState<"unknown" | "healthy" | "unhealthy">("unknown");
  const [documentCount, setDocumentCount] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        setDocumentCount(data.total_chunks || 0);
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
      const res = await fetch("/api/rag-backend/documents");
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

  // Delete document
  const handleDelete = async (docId: string) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(docId);
    setMessage(null);

    try {
      const res = await fetch(`/api/rag-backend/documents/by-id/${docId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: t.deleteSuccess });
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
      setDeletingId(null);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    await fetchStatus();
    await fetchDocuments();
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
              <Badge variant="outline">
                {documentCount} {t.chunks}
              </Badge>
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
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {doc.metadata?.title || "Untitled"}
                        </span>
                        {doc.metadata?.category && (
                          <Badge variant="outline" className="text-xs">
                            {doc.metadata.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {doc.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {doc.id.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
