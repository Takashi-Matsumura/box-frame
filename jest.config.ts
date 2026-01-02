import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Next.js アプリのパスを指定（next.config.js と .env を読み込む）
  dir: "./",
});

const config: Config = {
  // テスト環境
  testEnvironment: "node",

  // セットアップファイル
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // テストファイルのパターン
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],

  // モジュール名のマッピング（パスエイリアス）
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // カバレッジ設定
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],

  // カバレッジレポート形式
  coverageReporters: ["text", "lcov", "html"],

  // テストタイムアウト（ミリ秒）
  testTimeout: 30000,

  // 詳細出力
  verbose: true,
};

export default createJestConfig(config);
