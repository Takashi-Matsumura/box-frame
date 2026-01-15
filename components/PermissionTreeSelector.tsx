"use client";

import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PermissionGranularity } from "@/lib/modules/access-control";
import { cn } from "@/lib/utils";
import type { AppMenu, AppModule, AppTab } from "@/types/module";

/**
 * 選択された権限の情報
 */
export interface SelectedPermission {
  granularity: PermissionGranularity;
  moduleId: string;
  menuPath?: string;
  tabId?: string;
  // 表示用
  displayName: string;
  displayNameJa: string;
}

interface PermissionTreeSelectorProps {
  modules: AppModule[];
  selectedPermissions: SelectedPermission[];
  onSelectionChange: (permissions: SelectedPermission[]) => void;
  language?: string;
}

/**
 * モジュール・メニュー・タブの階層構造で権限を選択するコンポーネント
 */
export function PermissionTreeSelector({
  modules,
  selectedPermissions,
  onSelectionChange,
  language = "en",
}: PermissionTreeSelectorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // モジュールの展開/折りたたみ
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // メニューの展開/折りたたみ
  const toggleMenu = (menuPath: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuPath)) {
        next.delete(menuPath);
      } else {
        next.add(menuPath);
      }
      return next;
    });
  };

  // 権限が選択されているかチェック
  const isSelected = (
    granularity: PermissionGranularity,
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ): boolean => {
    return selectedPermissions.some(
      (p) =>
        p.granularity === granularity &&
        p.moduleId === moduleId &&
        p.menuPath === menuPath &&
        p.tabId === tabId,
    );
  };

  // 親レベルで選択されているかチェック（子は自動的に含まれる）
  const isImplicitlySelected = (
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ): boolean => {
    // モジュールレベルで選択されている場合
    if (
      selectedPermissions.some(
        (p) => p.granularity === "module" && p.moduleId === moduleId,
      )
    ) {
      return true;
    }

    // メニューレベルで選択されている場合（タブのチェック時）
    if (
      menuPath &&
      tabId &&
      selectedPermissions.some(
        (p) =>
          p.granularity === "menu" &&
          p.moduleId === moduleId &&
          p.menuPath === menuPath,
      )
    ) {
      return true;
    }

    return false;
  };

  // 権限の選択/解除
  const handleSelect = (
    granularity: PermissionGranularity,
    moduleId: string,
    displayName: string,
    displayNameJa: string,
    menuPath?: string,
    tabId?: string,
  ) => {
    const permission: SelectedPermission = {
      granularity,
      moduleId,
      menuPath,
      tabId,
      displayName,
      displayNameJa,
    };

    if (isSelected(granularity, moduleId, menuPath, tabId)) {
      // 選択解除
      onSelectionChange(
        selectedPermissions.filter(
          (p) =>
            !(
              p.granularity === granularity &&
              p.moduleId === moduleId &&
              p.menuPath === menuPath &&
              p.tabId === tabId
            ),
        ),
      );
    } else {
      // 選択
      // 上位レベルを選択した場合、下位レベルの選択を削除
      let filtered = selectedPermissions;

      if (granularity === "module") {
        // モジュール選択時：同モジュールのメニュー・タブ選択を削除
        filtered = selectedPermissions.filter((p) => p.moduleId !== moduleId);
      } else if (granularity === "menu") {
        // メニュー選択時：同メニューのタブ選択を削除、モジュール選択があれば何もしない
        const hasModuleSelection = selectedPermissions.some(
          (p) => p.granularity === "module" && p.moduleId === moduleId,
        );
        if (hasModuleSelection) {
          return; // モジュールが選択されている場合は追加しない
        }
        filtered = selectedPermissions.filter(
          (p) => !(p.moduleId === moduleId && p.menuPath === menuPath),
        );
      } else if (granularity === "tab") {
        // タブ選択時：上位が選択されている場合は追加しない
        const hasModuleSelection = selectedPermissions.some(
          (p) => p.granularity === "module" && p.moduleId === moduleId,
        );
        const hasMenuSelection = selectedPermissions.some(
          (p) =>
            p.granularity === "menu" &&
            p.moduleId === moduleId &&
            p.menuPath === menuPath,
        );
        if (hasModuleSelection || hasMenuSelection) {
          return;
        }
      }

      onSelectionChange([...filtered, permission]);
    }
  };

  // タブがあるメニューのみをフィルタリング
  const modulesWithTabs = useMemo(() => {
    return modules.filter((module) =>
      module.menus.some((menu) => menu.tabs && menu.tabs.length > 0),
    );
  }, [modules]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b">
        <p className="text-sm font-medium">
          {t("Select Permissions", "権限を選択")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Select modules, menus, or specific tabs to grant access",
            "アクセスを許可するモジュール、メニュー、または特定のタブを選択",
          )}
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {modulesWithTabs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t(
              "No modules with tabs available",
              "タブを持つモジュールがありません",
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {modulesWithTabs.map((module) => (
              <ModuleNode
                key={module.id}
                module={module}
                language={language}
                isExpanded={expandedModules.has(module.id)}
                expandedMenus={expandedMenus}
                onToggleModule={() => toggleModule(module.id)}
                onToggleMenu={toggleMenu}
                isSelected={isSelected}
                isImplicitlySelected={isImplicitlySelected}
                onSelect={handleSelect}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* 選択された権限の表示 */}
      {selectedPermissions.length > 0 && (
        <div className="border-t bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("Selected", "選択中")}: {selectedPermissions.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedPermissions.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
              >
                {language === "ja" ? p.displayNameJa : p.displayName}
                <span className="text-primary/60">({p.granularity})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * モジュールノード
 */
function ModuleNode({
  module,
  language,
  isExpanded,
  expandedMenus,
  onToggleModule,
  onToggleMenu,
  isSelected,
  isImplicitlySelected,
  onSelect,
  t,
}: {
  module: AppModule;
  language: string;
  isExpanded: boolean;
  expandedMenus: Set<string>;
  onToggleModule: () => void;
  onToggleMenu: (menuPath: string) => void;
  isSelected: (
    granularity: PermissionGranularity,
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  isImplicitlySelected: (
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  onSelect: (
    granularity: PermissionGranularity,
    moduleId: string,
    displayName: string,
    displayNameJa: string,
    menuPath?: string,
    tabId?: string,
  ) => void;
  t: (en: string, ja: string) => string;
}) {
  const menusWithTabs = module.menus.filter(
    (menu) => menu.tabs && menu.tabs.length > 0,
  );

  const moduleSelected = isSelected("module", module.id);
  const moduleDisplayName = `${module.name} (${t("Module", "モジュール")})`;
  const moduleDisplayNameJa = `${module.nameJa} (モジュール)`;

  return (
    <div className="rounded-lg border bg-card">
      {/* モジュールヘッダー */}
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors">
        <button
          type="button"
          onClick={onToggleModule}
          className="p-0.5 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <Checkbox
          checked={moduleSelected}
          onCheckedChange={() =>
            onSelect(
              "module",
              module.id,
              moduleDisplayName,
              moduleDisplayNameJa,
            )
          }
          className="data-[state=checked]:bg-primary"
        />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {module.icon && (
            <span className="text-muted-foreground flex-shrink-0">
              {module.icon}
            </span>
          )}
          <span className="font-medium text-sm truncate">
            {language === "ja" ? module.nameJa : module.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({t("Module", "モジュール")})
          </span>
        </div>
      </div>

      {/* メニュー一覧 */}
      {isExpanded && (
        <div className="border-t pl-6 py-1">
          {menusWithTabs.map((menu) => (
            <MenuNode
              key={menu.id}
              menu={menu}
              moduleId={module.id}
              language={language}
              isExpanded={expandedMenus.has(menu.path)}
              onToggle={() => onToggleMenu(menu.path)}
              isSelected={isSelected}
              isImplicitlySelected={isImplicitlySelected}
              moduleSelected={moduleSelected}
              onSelect={onSelect}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * メニューノード
 */
function MenuNode({
  menu,
  moduleId,
  language,
  isExpanded,
  onToggle,
  isSelected,
  isImplicitlySelected,
  moduleSelected,
  onSelect,
  t,
}: {
  menu: AppMenu;
  moduleId: string;
  language: string;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: (
    granularity: PermissionGranularity,
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  isImplicitlySelected: (
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  moduleSelected: boolean;
  onSelect: (
    granularity: PermissionGranularity,
    moduleId: string,
    displayName: string,
    displayNameJa: string,
    menuPath?: string,
    tabId?: string,
  ) => void;
  t: (en: string, ja: string) => string;
}) {
  const tabs = menu.tabs || [];
  const menuSelected = isSelected("menu", moduleId, menu.path);
  const implicitlySelected = isImplicitlySelected(moduleId, menu.path);

  const menuDisplayName = `${menu.name} (${t("Menu", "メニュー")})`;
  const menuDisplayNameJa = `${menu.nameJa} (メニュー)`;

  return (
    <div className="py-0.5">
      {/* メニューヘッダー */}
      <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="p-0.5 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <Checkbox
          checked={menuSelected || implicitlySelected}
          disabled={implicitlySelected}
          onCheckedChange={() =>
            onSelect(
              "menu",
              moduleId,
              menuDisplayName,
              menuDisplayNameJa,
              menu.path,
            )
          }
          className={cn(
            "data-[state=checked]:bg-primary",
            implicitlySelected && "opacity-50",
          )}
        />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {menu.icon && (
            <span className="text-muted-foreground flex-shrink-0">
              {menu.icon}
            </span>
          )}
          <span className="text-sm truncate">
            {language === "ja" ? menu.nameJa : menu.name}
          </span>
          <span className="text-xs text-muted-foreground">{menu.path}</span>
        </div>
      </div>

      {/* タブ一覧 */}
      {isExpanded && tabs.length > 0 && (
        <div className="pl-8 py-1 space-y-0.5">
          {tabs
            .filter((tab) => tab.enabled !== false)
            .sort((a, b) => a.order - b.order)
            .map((tab) => (
              <TabNode
                key={tab.id}
                tab={tab}
                moduleId={moduleId}
                menuPath={menu.path}
                language={language}
                isSelected={isSelected}
                isImplicitlySelected={isImplicitlySelected}
                menuSelected={menuSelected}
                moduleSelected={moduleSelected}
                onSelect={onSelect}
                t={t}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * タブノード
 */
function TabNode({
  tab,
  moduleId,
  menuPath,
  language,
  isSelected,
  isImplicitlySelected,
  menuSelected,
  moduleSelected,
  onSelect,
  t,
}: {
  tab: AppTab;
  moduleId: string;
  menuPath: string;
  language: string;
  isSelected: (
    granularity: PermissionGranularity,
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  isImplicitlySelected: (
    moduleId: string,
    menuPath?: string,
    tabId?: string,
  ) => boolean;
  menuSelected: boolean;
  moduleSelected: boolean;
  onSelect: (
    granularity: PermissionGranularity,
    moduleId: string,
    displayName: string,
    displayNameJa: string,
    menuPath?: string,
    tabId?: string,
  ) => void;
  t: (en: string, ja: string) => string;
}) {
  const tabSelected = isSelected("tab", moduleId, menuPath, tab.id);
  const implicitlySelected = isImplicitlySelected(moduleId, menuPath, tab.id);
  const isLocked = tab.allowAccessKey === false;

  const tabDisplayName = `${tab.name} (${t("Tab", "タブ")})`;
  const tabDisplayNameJa = `${tab.nameJa} (タブ)`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded transition-colors",
              isLocked
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-muted/50 cursor-pointer",
            )}
          >
            <Checkbox
              checked={tabSelected || implicitlySelected}
              disabled={isLocked || implicitlySelected}
              onCheckedChange={() =>
                !isLocked &&
                onSelect(
                  "tab",
                  moduleId,
                  tabDisplayName,
                  tabDisplayNameJa,
                  menuPath,
                  tab.id,
                )
              }
              className={cn(
                "data-[state=checked]:bg-primary",
                (isLocked || implicitlySelected) && "opacity-50",
              )}
            />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              {tab.icon && (
                <span className="text-muted-foreground flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <span className="text-sm truncate">
                {language === "ja" ? tab.nameJa : tab.name}
              </span>
              {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
        </TooltipTrigger>
        {isLocked && (
          <TooltipContent>
            <p>
              {t(
                "This tab cannot be delegated via access key",
                "このタブはアクセスキーで委譲できません",
              )}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
