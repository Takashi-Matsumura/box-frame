"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface SidebarNavigationContextType {
  loadingPath: string | null;
  setLoadingPath: (path: string | null) => void;
}

const SidebarNavigationContext =
  createContext<SidebarNavigationContextType | null>(null);

export function SidebarNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const pathname = usePathname();

  // パスが変わったらローディング状態をクリア
  useEffect(() => {
    if (loadingPath && pathname === loadingPath) {
      setLoadingPath(null);
    }
  }, [pathname, loadingPath]);

  // 一定時間経過後もローディングが続いていたらクリア（フォールバック）
  useEffect(() => {
    if (loadingPath) {
      const timeout = setTimeout(() => {
        setLoadingPath(null);
      }, 10000); // 10秒でタイムアウト
      return () => clearTimeout(timeout);
    }
  }, [loadingPath]);

  return (
    <SidebarNavigationContext.Provider value={{ loadingPath, setLoadingPath }}>
      {children}
    </SidebarNavigationContext.Provider>
  );
}

export function useSidebarNavigation() {
  const context = useContext(SidebarNavigationContext);
  // プロバイダー外で使用された場合はフォールバック（ローディング表示なし）
  if (!context) {
    return {
      loadingPath: null,
      setLoadingPath: () => {},
    };
  }
  return context;
}
