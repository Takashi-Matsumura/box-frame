"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AppMenu } from "@/types/module";
import { SidebarMenuItemComponent } from "./SidebarMenuItem";

interface SidebarMenuGroupProps {
  group: {
    id: string;
    name: string;
    nameJa: string;
    color?: string;
  };
  menus: AppMenu[];
  language: string;
  isAdmin: boolean;
}

export function SidebarMenuGroup({
  group,
  menus,
  language,
  isAdmin,
}: SidebarMenuGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (menus.length === 0) return null;

  const groupTitle = language === "ja" ? group.nameJa : group.name;

  // サイドバーが折りたたまれている場合はグループヘッダーなしでアイコンのみ表示
  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {menus.map((menu) => (
            <SidebarMenuItemComponent
              key={menu.id}
              menu={menu}
              language={language}
              showOrder={isAdmin}
              color={group.color}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 h-auto flex justify-between items-center mb-2">
            <span className="uppercase text-xs font-semibold tracking-wide">
              {groupTitle}
            </span>
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {menus.map((menu) => (
                <SidebarMenuItemComponent
                  key={menu.id}
                  menu={menu}
                  language={language}
                  showOrder={isAdmin}
                  color={group.color}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
