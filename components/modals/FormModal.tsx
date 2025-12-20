"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/Icons";
import { BaseModal } from "./BaseModal";

interface FormModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 閉じる時のコールバック */
  onClose: () => void;
  /** フォーム送信時のコールバック（非同期） */
  onSubmit: () => Promise<void>;
  /** モーダルのタイトル */
  title: string;
  /** フォームフィールド */
  children: React.ReactNode;
  /** 送信ボタンのラベル */
  submitLabel: string;
  /** キャンセルボタンのラベル */
  cancelLabel?: string;
  /** 言語設定 */
  language?: "en" | "ja";
  /** モーダルの最大幅 */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  /** 送信成功時に自動で閉じるか */
  closeOnSuccess?: boolean;
}

/**
 * フォーム用モーダルコンポーネント
 *
 * BaseModalを継承し、以下の機能を追加:
 * - フォーム送信処理
 * - ローディング状態管理
 * - エラー表示
 * - キャンセル/送信ボタン
 */
export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel,
  cancelLabel,
  language = "en",
  maxWidth = "2xl",
  closeOnSuccess = true,
}: FormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCancelLabel = language === "ja" ? "キャンセル" : "Cancel";
  const finalCancelLabel = cancelLabel ?? defaultCancelLabel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit();
      if (closeOnSuccess) {
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === "ja"
            ? "エラーが発生しました"
            : "An error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError(null);
      onClose();
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={submitting}
        className="flex-1 px-6 py-3 border border-input rounded-lg text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {finalCancelLabel}
      </button>
      <button
        type="submit"
        form="modal-form"
        disabled={submitting}
        aria-busy={submitting}
        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting && <LoadingSpinner className="w-4 h-4" />}
        {submitting
          ? language === "ja"
            ? "送信中..."
            : "Submitting..."
          : submitLabel}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={footer}
      maxWidth={maxWidth}
      closeOnBackdrop={!submitting}
      closeOnEsc={!submitting}
      language={language}
    >
      {/* エラー表示 */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
        >
          {error}
        </div>
      )}

      {/* フォーム */}
      <form id="modal-form" onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </BaseModal>
  );
}
