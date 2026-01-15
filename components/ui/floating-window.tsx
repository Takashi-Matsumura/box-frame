"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";
import {
  MIN_SIZE,
  useFloatingWindowStore,
} from "@/lib/stores/floating-window-store";

interface FloatingWindowProps {
  language?: "en" | "ja";
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function FloatingWindow({ language = "en" }: FloatingWindowProps) {
  const {
    isOpen,
    isMinimized,
    isMaximized,
    position,
    size,
    title,
    titleJa,
    content,
    close,
    minimize,
    maximize,
    restore,
    setPosition,
    setSize,
  } = useFloatingWindowStore();

  const windowRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const resizeDirectionRef = useRef<ResizeDirection | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const initialSizeRef = useRef({ width: 0, height: 0 });

  // ドラッグ開始
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialPosRef.current = { ...position };
      document.body.style.cursor = "move";
      document.body.style.userSelect = "none";
    },
    [position, isMaximized],
  );

  // リサイズ開始
  const handleResizeStart = useCallback(
    (direction: ResizeDirection) => (e: React.MouseEvent) => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      resizeDirectionRef.current = direction;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialPosRef.current = { ...position };
      initialSizeRef.current = { ...size };
      document.body.style.userSelect = "none";
    },
    [position, size, isMaximized],
  );

  // マウス移動・リリースのイベントハンドラ
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // ドラッグ中
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPosition({
          x: Math.max(0, initialPosRef.current.x + deltaX),
          y: Math.max(0, initialPosRef.current.y + deltaY),
        });
      }

      // リサイズ中
      if (isResizingRef.current && resizeDirectionRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        const dir = resizeDirectionRef.current;

        let newWidth = initialSizeRef.current.width;
        let newHeight = initialSizeRef.current.height;
        let newX = initialPosRef.current.x;
        let newY = initialPosRef.current.y;

        // 方向に応じたサイズ・位置計算
        if (dir.includes("e")) newWidth += deltaX;
        if (dir.includes("w")) {
          newWidth -= deltaX;
          newX += deltaX;
        }
        if (dir.includes("s")) newHeight += deltaY;
        if (dir.includes("n")) {
          newHeight -= deltaY;
          newY += deltaY;
        }

        // 最小サイズの制限を適用
        if (newWidth >= MIN_SIZE.width) {
          setSize({ width: newWidth, height: size.height });
          if (dir.includes("w")) {
            setPosition({ x: newX, y: position.y });
          }
        }
        if (newHeight >= MIN_SIZE.height) {
          setSize({ width: size.width, height: newHeight });
          if (dir.includes("n")) {
            setPosition({ x: position.x, y: newY });
          }
        }
        // 両方同時に更新
        if (newWidth >= MIN_SIZE.width && newHeight >= MIN_SIZE.height) {
          setSize({ width: newWidth, height: newHeight });
          if (dir.includes("w") || dir.includes("n")) {
            setPosition({ x: newX, y: newY });
          }
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
      resizeDirectionRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setPosition, setSize, position, size]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isMinimized) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMinimized, close]);

  // SSR対策
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  const displayTitle = language === "ja" ? titleJa : title;

  // 最小化時はタスクバー風の表示
  if (isMinimized) {
    return createPortal(
      <button
        type="button"
        className="fixed bottom-4 left-4 z-[100] bg-card border border-border rounded-lg shadow-lg cursor-pointer hover:bg-accent transition-colors"
        onClick={restore}
      >
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-medium">{displayTitle}</span>
          <span className="text-xs text-muted-foreground">
            {language === "ja" ? "クリックで復元" : "Click to restore"}
          </span>
        </div>
      </button>,
      document.body,
    );
  }

  // リサイズハンドルの共通スタイル
  const resizeHandleClass =
    "absolute bg-transparent hover:bg-primary/20 transition-colors";

  const windowContent = (
    <div
      ref={windowRef}
      className="fixed z-[100] bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden"
      style={{
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
        width: isMaximized ? "100vw" : size.width,
        height: isMaximized ? "100vh" : size.height,
      }}
    >
      {/* タイトルバー */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-muted border-b border-border cursor-move select-none"
        onMouseDown={handleDragStart}
        onDoubleClick={() => (isMaximized ? restore() : maximize())}
      >
        <h3 className="text-sm font-semibold text-foreground truncate">
          {displayTitle}
        </h3>
        <div className="flex items-center gap-1">
          {/* 最小化ボタン */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              minimize();
            }}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            aria-label={language === "ja" ? "最小化" : "Minimize"}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          </button>
          {/* 最大化/復元ボタン */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              isMaximized ? restore() : maximize();
            }}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            aria-label={
              language === "ja"
                ? isMaximized
                  ? "元に戻す"
                  : "最大化"
                : isMaximized
                  ? "Restore"
                  : "Maximize"
            }
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              {isMaximized ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                />
              ) : (
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  strokeWidth={2}
                />
              )}
            </svg>
          </button>
          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            aria-label={language === "ja" ? "閉じる" : "Close"}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-auto p-4">{content}</div>

      {/* リサイズハンドル（最大化時は非表示） */}
      {!isMaximized && (
        <>
          {/* 四辺 */}
          <div
            className={`${resizeHandleClass} top-0 left-2 right-2 h-1 cursor-n-resize`}
            onMouseDown={handleResizeStart("n")}
          />
          <div
            className={`${resizeHandleClass} bottom-0 left-2 right-2 h-1 cursor-s-resize`}
            onMouseDown={handleResizeStart("s")}
          />
          <div
            className={`${resizeHandleClass} left-0 top-2 bottom-2 w-1 cursor-w-resize`}
            onMouseDown={handleResizeStart("w")}
          />
          <div
            className={`${resizeHandleClass} right-0 top-2 bottom-2 w-1 cursor-e-resize`}
            onMouseDown={handleResizeStart("e")}
          />
          {/* 四隅 */}
          <div
            className={`${resizeHandleClass} top-0 left-0 w-2 h-2 cursor-nw-resize`}
            onMouseDown={handleResizeStart("nw")}
          />
          <div
            className={`${resizeHandleClass} top-0 right-0 w-2 h-2 cursor-ne-resize`}
            onMouseDown={handleResizeStart("ne")}
          />
          <div
            className={`${resizeHandleClass} bottom-0 left-0 w-2 h-2 cursor-sw-resize`}
            onMouseDown={handleResizeStart("sw")}
          />
          <div
            className={`${resizeHandleClass} bottom-0 right-0 w-2 h-2 cursor-se-resize`}
            onMouseDown={handleResizeStart("se")}
          />
        </>
      )}
    </div>
  );

  return createPortal(windowContent, document.body);
}
