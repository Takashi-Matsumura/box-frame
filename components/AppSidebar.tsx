"use client";

import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu } from "@/types/module";
import { SidebarHeaderContent } from "./sidebar/SidebarHeaderContent";
import { SidebarMenuGroup } from "./sidebar/SidebarMenuGroup";
import { SidebarUserSection } from "./sidebar/SidebarUserSection";

interface AppSidebarProps {
  session: Session;
  accessibleMenus: AppMenu[];
  groupedMenus: Record<string, AppMenu[]>;
  menuGroups: Array<{
    id: string;
    name: string;
    nameJa: string;
    color?: string;
  }>;
  language?: string;
  mustChangePassword?: boolean;
}

export function AppSidebar({
  session,
  groupedMenus,
  menuGroups,
  language = "en",
  mustChangePassword = false,
}: AppSidebarProps) {
  const { width } = useSidebarStore();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      style={
        {
          "--sidebar-width": `${width}px`,
        } as React.CSSProperties
      }
    >
      <SidebarHeaderContent language={language} />

      <SidebarContent>
        {menuGroups.map((group) => {
          const menus = groupedMenus[group.id] || [];
          return (
            <SidebarMenuGroup
              key={group.id}
              group={group}
              menus={menus}
              language={language}
              isAdmin={isAdmin}
            />
          );
        })}
      </SidebarContent>

      <SidebarUserSection
        session={session}
        language={language}
        mustChangePassword={mustChangePassword}
      />

      <SidebarRail />
    </Sidebar>
  );
}
