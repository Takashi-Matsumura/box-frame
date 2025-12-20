// lib/config/module-config.ts
export interface ModuleConfig {
  id: string;
  enabled: boolean;
  type: "core";
  dependencies: string[];
}

export const moduleConfigs: Record<string, ModuleConfig> = {
  // コアモジュール（常に有効）
  organization: {
    id: "organization",
    enabled: true,
    type: "core",
    dependencies: [],
  },
  system: {
    id: "system",
    enabled: true,
    type: "core",
    dependencies: [],
  },
} as const;

export function isModuleEnabled(moduleId: string): boolean {
  return moduleConfigs[moduleId]?.enabled ?? false;
}

export function getEnabledModules(): string[] {
  return Object.entries(moduleConfigs)
    .filter(([_, config]) => config.enabled)
    .map(([id]) => id);
}

export function getCoreModules(): string[] {
  return Object.entries(moduleConfigs)
    .filter(([_, config]) => config.type === "core" && config.enabled)
    .map(([id]) => id);
}
