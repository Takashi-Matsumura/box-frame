// lib/config/module-dependencies.ts
export const moduleDependencies = {
  // コアモジュール
  organization: [],
  system: [],
} as const;

export type ModuleId = keyof typeof moduleDependencies;
