import "@testing-library/jest-dom";

// グローバルモック: Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// グローバルモック: 認証
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// グローバルモック: fetch（外部API用）
global.fetch = jest.fn();

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks();
});
