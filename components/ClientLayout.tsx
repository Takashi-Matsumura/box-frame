"use client";

import type { Session } from "next-auth";
import { useEffect, useRef } from "react";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu } from "@/types/module";
import { AppSidebar } from "./AppSidebar";

interface ClientLayoutProps {
  session: Session | null;
  userPermissions?: string[];
  language?: string;
  accessibleMenus?: AppMenu[];
  groupedMenus?: Record<string, AppMenu[]>;
  menuGroups?: Array<{
    id: string;
    name: string;
    nameJa: string;
    color?: string;
  }>;
  mustChangePassword?: boolean;
  children: React.ReactNode;
}

function ResizeHandle() {
  const { width, setWidth, isModalOpen } = useSidebarStore();
  const { open, isMobile } = useSidebar();
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      setWidth(e.clientX);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // タブレット/モバイル時は非表示
  if (!open || isModalOpen || isMobile) return null;

  return (
    <div
      className="fixed top-0 w-1 h-full cursor-col-resize hover:bg-primary transition-colors bg-border z-10"
      style={{ left: `${width - 4}px` }}
      title="Drag to resize"
      onMouseDown={handleMouseDown}
    />
  );
}

export function ClientLayout({
  session,
  language = "en",
  accessibleMenus = [],
  groupedMenus = {},
  menuGroups = [],
  mustChangePassword = false,
  children,
}: ClientLayoutProps) {
  if (!session) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar
        session={session}
        accessibleMenus={accessibleMenus}
        groupedMenus={groupedMenus}
        menuGroups={menuGroups}
        language={language}
        mustChangePassword={mustChangePassword}
      />
      <ResizeHandle />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
