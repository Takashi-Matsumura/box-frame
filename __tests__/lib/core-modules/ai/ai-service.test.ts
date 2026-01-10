/**
 * AIService のテスト
 *
 * 仕様: CLAUDE.md「外部モジュール向けAPIサービス」セクション
 * 外部モジュールが依存するAIサービスの契約テスト
 */

import { AIService } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";

// Prismaモック
jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findMany: jest.fn(),
    },
  },
}));

// fetchモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// AI設定のモック（ローカルLLM）
const mockLocalConfig = [
  { key: "ai_enabled", value: "true" },
  { key: "ai_provider", value: "local" },
  { key: "ai_local_provider", value: "llama.cpp" },
  {
    key: "ai_local_endpoint",
    value: "http://localhost:8080/v1/chat/completions",
  },
  { key: "ai_local_model", value: "test-model" },
];

// AI設定のモック（無効）
const mockDisabledConfig = [{ key: "ai_enabled", value: "false" }];

describe("AIService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isAvailable", () => {
    it("AI が有効でエンドポイントが設定されている場合 true", async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockLocalConfig,
      );

      const result = await AIService.isAvailable();
      expect(result).toBe(true);
    });

    it("AI が無効の場合 false", async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockDisabledConfig,
      );

      const result = await AIService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("設定を正しく取得できる", async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockLocalConfig,
      );

      const config = await AIService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.provider).toBe("local");
      expect(config.localProvider).toBe("llama.cpp");
      expect(config.localEndpoint).toBe(
        "http://localhost:8080/v1/chat/completions",
      );
      expect(config.localModel).toBe("test-model");
    });

    it("未設定の場合はデフォルト値を返す", async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue([]);

      const config = await AIService.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.provider).toBe("local");
      expect(config.localProvider).toBe("llama.cpp");
    });
  });

  describe("generate", () => {
    beforeEach(() => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockLocalConfig,
      );
    });

    it("正常なリクエストで output, provider, model を返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Generated text response" } }],
        }),
      });

      const result = await AIService.generate({
        input: "Test input",
        systemPrompt: "You are a helpful assistant",
      });

      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result.output).toBe("Generated text response");
      expect(result.provider).toBe("local");
    });

    it("AI が無効の場合はエラーをスロー", async () => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockDisabledConfig,
      );

      await expect(
        AIService.generate({
          input: "Test",
          systemPrompt: "Test",
        }),
      ).rejects.toThrow("AI is not enabled");
    });

    it("外部APIエラー時は適切なエラーをスロー", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(
        AIService.generate({
          input: "Test",
          systemPrompt: "Test",
        }),
      ).rejects.toThrow(/Local LLM error/);
    });

    it("temperature と maxTokens オプションが正しく渡される", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }],
        }),
      });

      await AIService.generate({
        input: "Test",
        systemPrompt: "Test",
        temperature: 0.5,
        maxTokens: 500,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/v1/chat/completions",
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.5'),
        }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/v1/chat/completions",
        expect.objectContaining({
          body: expect.stringContaining('"max_tokens":500'),
        }),
      );
    });
  });

  describe("summarize", () => {
    beforeEach(() => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockLocalConfig,
      );
    });

    it("正常なリクエストで summary, provider, model を返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is a summary." } }],
        }),
      });

      const result = await AIService.summarize({
        text: "Long text to summarize...",
      });

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result.summary).toBe("This is a summary.");
    });

    it("length オプションがシステムプロンプトに反映される", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Short summary" } }],
        }),
      });

      await AIService.summarize({
        text: "Text",
        length: "short",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain("1-2 sentences");
    });

    it("language オプションがシステムプロンプトに反映される", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "日本語の要約" } }],
        }),
      });

      await AIService.summarize({
        text: "Text",
        language: "ja",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain("日本語で出力");
    });
  });

  describe("extract", () => {
    beforeEach(() => {
      (prisma.systemSetting.findMany as jest.Mock).mockResolvedValue(
        mockLocalConfig,
      );
    });

    it("正常なリクエストで data, provider, model を返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"name": "田中太郎", "age": 35}' } },
          ],
        }),
      });

      const result = await AIService.extract({
        text: "田中太郎さんは35歳です。",
        schema: [
          { name: "name", description: "名前", type: "string" },
          { name: "age", description: "年齢", type: "number" },
        ],
      });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result.data).toEqual({ name: "田中太郎", age: 35 });
    });

    it("マークダウンコードブロック付きのJSONもパースできる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '```json\n{"name": "山田花子"}\n```' } },
          ],
        }),
      });

      const result = await AIService.extract({
        text: "山田花子さん",
        schema: [{ name: "name", description: "名前", type: "string" }],
      });

      expect(result.data).toEqual({ name: "山田花子" });
    });

    it("スキーマがシステムプロンプトに反映される", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"field": "value"}' } }],
        }),
      });

      await AIService.extract({
        text: "Text",
        schema: [
          {
            name: "field",
            description: "フィールドの説明",
            type: "string",
            required: true,
          },
        ],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain("field");
      expect(callBody.messages[0].content).toContain("フィールドの説明");
      expect(callBody.messages[0].content).toContain("(required)");
    });

    it("不正なJSONの場合はエラーをスロー", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is not JSON" } }],
        }),
      });

      await expect(
        AIService.extract({
          text: "Text",
          schema: [{ name: "field", description: "desc", type: "string" }],
        }),
      ).rejects.toThrow(/Failed to parse extraction result/);
    });
  });
});
