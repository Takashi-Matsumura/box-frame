"use client";

import { PanelLeft } from "lucide-react";
import { useCallback, useEffect } from "react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

interface SidebarHeaderContentProps {
  language: string;
}

export function SidebarHeaderContent({ language }: SidebarHeaderContentProps) {
  const { toggleSidebar, open } = useSidebar();
  const { setOpen } = useSidebarStore();

  // SidebarProviderの状態をZustand storeに同期
  useEffect(() => {
    setOpen(open);
  }, [open, setOpen]);

  const handleToggle = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return (
    <SidebarHeader className="p-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            onClick={handleToggle}
            tooltip={language === "ja" ? "サイドバー切替" : "Toggle Sidebar"}
          >
            <span className="text-xl font-bold truncate group-data-[collapsible=icon]:hidden flex-1 text-left">BoxFrame</span>
            <PanelLeft className="size-5 shrink-0" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
