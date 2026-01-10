"use client";

import { ChevronRight, Key } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { AppMenu } from "@/types/module";

// TailwindクラスからHEX値へのマッピング
const colorMap: Record<string, string> = {
  "text-gray-600": "#4b5563",
  "text-cyan-700": "#0e7490",
  "text-green-700": "#15803d",
  "text-rose-700": "#be123c",
  "text-purple-700": "#7e22ce",
};

interface SidebarMenuItemComponentProps {
  menu: AppMenu;
  language: string;
  showOrder: boolean;
  color?: string;
}

export function SidebarMenuItemComponent({
  menu,
  language,
  showOrder,
  color,
}: SidebarMenuItemComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const hasChildren = menu.children && menu.children.length > 0;
  const label = language === "ja" ? menu.nameJa : menu.name;
  const isImplemented = menu.isImplemented !== false;
  const isAccessKeyGranted = menu.isAccessKeyGranted === true;
  const isActive = pathname === menu.path;

  // メニューアイコンのレンダリング
  const renderIcon = () => {
    if (!menu.icon) return null;

    // TailwindクラスをHEX値に変換
    const hexColor = color ? colorMap[color] || color : undefined;
    const isAddonModule = menu.moduleId !== "system";

    return (
      <div className="relative flex items-center justify-center size-5 [&>svg]:size-4">
        <div style={hexColor ? { color: hexColor } : undefined}>
          {menu.icon}
        </div>
        {isAddonModule && hexColor && (
          <div
            className="absolute -bottom-1 left-0.5 right-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: hexColor }}
          />
        )}
      </div>
    );
  };

  // 子メニューがある場合
  if (hasChildren) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={label}
              className={!isImplemented ? "opacity-60" : ""}
            >
              {renderIcon()}
              <span className="truncate">{label}</span>
              {isAccessKeyGranted && (
                <Key className="size-3.5 text-amber-500 ml-1" />
              )}
              {showOrder && menu.order !== undefined && (
                <span className="ml-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  {menu.order}
                </span>
              )}
              <ChevronRight
                className={`ml-auto size-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {menu.children?.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === child.path}
                  >
                    <Link href={child.path}>
                      <span>
                        {language === "ja" ? child.nameJa : child.name}
                      </span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  // 子メニューがない場合
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={label}
        isActive={isActive}
        className={!isImplemented ? "opacity-60" : ""}
      >
        <Link href={menu.path}>
          {renderIcon()}
          <span className="truncate">{label}</span>
          {isAccessKeyGranted && (
            <Key className="size-3.5 text-amber-500 ml-auto" />
          )}
          {showOrder && menu.order !== undefined && (
            <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              {menu.order}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
