import { useMemo } from "react";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { isMobileAccessible } from "@/lib/modules/access-control";
import type { AppMenu } from "@/types/module";

interface UseMobileRestrictionOptions {
  /** 全メニュー一覧 */
  allMenus: AppMenu[];
}

interface UseMobileRestrictionResult {
  /** モバイル端末かどうか */
  isTabletOrMobile: boolean;
  /** 指定パスがモバイルでアクセス可能かチェック */
  isPathAccessible: (path: string) => boolean;
  /** 指定メニューがモバイルでアクセス可能かチェック */
  isMenuAccessible: (menu: AppMenu) => boolean;
}

/**
 * モバイル制限をプログラム的にチェックするフック
 *
 * @example
 * const { isTabletOrMobile, isPathAccessible } = useMobileRestriction({
 *   allMenus: accessibleMenus,
 * });
 *
 * if (isTabletOrMobile && !isPathAccessible("/admin")) {
 *   // モバイルで非対応ページ
 * }
 */
export function useMobileRestriction({
  allMenus,
}: UseMobileRestrictionOptions): UseMobileRestrictionResult {
  const isTabletOrMobile = useIsTabletOrMobile();

  const menuByPath = useMemo(() => {
    const map = new Map<string, AppMenu>();
    for (const menu of allMenus) {
      map.set(menu.path, menu);
    }
    return map;
  }, [allMenus]);

  const isPathAccessible = (path: string): boolean => {
    const menu = menuByPath.get(path);
    if (!menu) {
      // メニューに登録されていないパスはデフォルトでアクセス可能
      return true;
    }
    return isMobileAccessible(menu, isTabletOrMobile);
  };

  const isMenuAccessible = (menu: AppMenu): boolean => {
    return isMobileAccessible(menu, isTabletOrMobile);
  };

  return {
    isTabletOrMobile,
    isPathAccessible,
    isMenuAccessible,
  };
}
