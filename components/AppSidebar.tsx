"use client";

import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { filterGroupedMenusForMobile } from "@/lib/modules/access-control";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu } from "@/types/module";
import { SidebarHeaderContent } from "./sidebar/SidebarHeaderContent";
import { SidebarMenuGroup } from "./sidebar/SidebarMenuGroup";
import { SidebarNavigationProvider } from "./sidebar/SidebarNavigationContext";
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
  const isTabletOrMobile = useIsTabletOrMobile();

  // モバイル端末ではmobileEnabled: falseのメニューを非表示
  const filteredGroupedMenus = filterGroupedMenusForMobile(
    groupedMenus,
    isTabletOrMobile,
  );

  return (
    <SidebarNavigationProvider>
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
            const menus = filteredGroupedMenus[group.id] || [];
            // メニューが空のグループは表示しない
            if (menus.length === 0) {
              return null;
            }
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
    </SidebarNavigationProvider>
  );
}
