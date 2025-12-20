import Link from "next/link";
import { IoChevronBack } from "react-icons/io5";

/**
 * BackButton - 統一された戻るボタンコンポーネント
 *
 * 使用例:
 * <BackButton href="/parent/page" label="一覧に戻る" language="ja" />
 * <BackButton href="/parent/page" language="en" />
 * <BackButton onClick={() => setShowModal(false)} /> // onClick対応
 */
export interface BackButtonProps {
  /** 戻り先のURL（hrefまたはonClickのどちらかを指定） */
  href?: string;
  /** クリックハンドラ（hrefまたはonClickのどちらかを指定） */
  onClick?: () => void;
  /** カスタムラベル（省略時はアイコンのみ） */
  label?: string;
  /** 言語設定 */
  language?: "en" | "ja";
  /** 追加のCSSクラス */
  className?: string;
}

export function BackButton({
  href,
  onClick,
  label,
  language = "ja",
  className = "",
}: BackButtonProps) {
  // デフォルトラベル
  const defaultLabel = language === "ja" ? "戻る" : "Back";
  const displayLabel = label || defaultLabel;

  const iconElement = (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground text-background shadow-md hover:bg-foreground transition-colors">
      <IoChevronBack className="w-5 h-5" />
    </span>
  );

  const commonClassName = `inline-flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors ${className}`;

  // onClickが指定されている場合はbutton要素を使用
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={commonClassName}>
        {iconElement}
        {label && <span className="text-sm font-medium">{displayLabel}</span>}
      </button>
    );
  }

  // hrefが指定されている場合はLink要素を使用
  if (href) {
    return (
      <Link href={href} className={commonClassName}>
        {iconElement}
        {label && <span className="text-sm font-medium">{displayLabel}</span>}
      </Link>
    );
  }

  // どちらも指定されていない場合はボタンとして表示（非推奨）
  return (
    <span className={commonClassName}>
      {iconElement}
      {label && <span className="text-sm font-medium">{displayLabel}</span>}
    </span>
  );
}
