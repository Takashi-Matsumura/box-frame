"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { FaDesktop } from "react-icons/fa";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";

const translations = {
  en: {
    title: "PC Only",
    message: "This feature is only available on desktop devices.",
    redirecting: "Redirecting...",
  },
  ja: {
    title: "PC専用",
    message: "この機能はデスクトップ端末でのみご利用いただけます。",
    redirecting: "リダイレクト中...",
  },
};

interface MobileRestrictionProps {
  children: ReactNode;
  /** リダイレクト先URL（指定時は自動リダイレクト） */
  redirectTo?: string;
  /** 言語 */
  language?: string;
  /** カスタムメッセージ（英語） */
  customMessage?: string;
  /** カスタムメッセージ（日本語） */
  customMessageJa?: string;
}

/**
 * モバイル端末で非対応ページにアクセスした際に表示するコンポーネント
 *
 * @example
 * // リダイレクトなし（メッセージのみ表示）
 * <MobileRestriction language={language}>
 *   <AdminContent />
 * </MobileRestriction>
 *
 * @example
 * // ダッシュボードにリダイレクト
 * <MobileRestriction redirectTo="/dashboard" language={language}>
 *   <AdminContent />
 * </MobileRestriction>
 */
export function MobileRestriction({
  children,
  redirectTo,
  language = "en",
  customMessage,
  customMessageJa,
}: MobileRestrictionProps) {
  const isTabletOrMobile = useIsTabletOrMobile();
  const router = useRouter();
  const t = language === "ja" ? translations.ja : translations.en;

  useEffect(() => {
    if (isTabletOrMobile && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isTabletOrMobile, redirectTo, router]);

  // デスクトップの場合は子コンポーネントを表示
  if (!isTabletOrMobile) {
    return <>{children}</>;
  }

  // リダイレクト中
  if (redirectTo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center animate-pulse">
            <FaDesktop className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{t.redirecting}</p>
        </div>
      </div>
    );
  }

  // メッセージ表示
  const message =
    language === "ja"
      ? (customMessageJa ?? t.message)
      : (customMessage ?? t.message);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <FaDesktop className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
