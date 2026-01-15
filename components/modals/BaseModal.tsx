"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

interface BaseModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 閉じる時のコールバック */
  onClose: () => void;
  /** モーダルのタイトル */
  title: string;
  /** メインコンテンツ */
  children: React.ReactNode;
  /** フッター部分（ボタンなど） */
  footer?: React.ReactNode;
  /** モーダルの最大幅 */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  /** 背景クリックで閉じるか */
  closeOnBackdrop?: boolean;
  /** Escapeキーで閉じるか */
  closeOnEsc?: boolean;
  /** 言語設定（閉じるボタンのaria-label用） */
  language?: "en" | "ja";
}

/**
 * 汎用モーダルベースコンポーネント
 *
 * 機能:
 * - role="dialog"とaria-modal="true"による適切なアクセシビリティ
 * - Escapeキーで閉じる
 * - フォーカストラップ（Tabキーでモーダル内を循環）
 * - 背景クリックで閉じる（オプション）
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "2xl",
  closeOnBackdrop = true,
  closeOnEsc = true,
  language = "en",
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { setModalOpen } = useSidebarStore();

  // モーダルの開閉状態を管理
  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  // Escapeキーで閉じる
  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // フォーカストラップ
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 最初の要素にフォーカス
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    modal.addEventListener("keydown", handleTab as EventListener);
    return () =>
      modal.removeEventListener("keydown", handleTab as EventListener);
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  }[maxWidth];

  const modalContent = (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative bg-card rounded-lg shadow-xl ${maxWidthClass} w-full max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b">
            <h2 id="modal-title" className="text-xl font-bold text-foreground">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={language === "ja" ? "閉じる" : "Close"}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content - スクロール可能 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 border-t px-6 py-4 bg-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Portal to render modal at body level
  return createPortal(modalContent, document.body);
}
