/**
 * /api/ai/services/generate API契約テスト
 *
 * 仕様: CLAUDE.md「外部モジュール向けAPIサービス - 汎用テキスト生成」
 *
 * リクエスト:
 *   input: string (必須)
 *   systemPrompt: string (必須)
 *   temperature: number (オプション, 0-2)
 *   maxTokens: number (オプション, 1-10000)
 *
 * レスポンス:
 *   output: string
 *   provider: string
 *   model: string
 */

import { POST } from "@/app/api/ai/services/generate/route";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

// モック
jest.mock("@/auth");
jest.mock("@/lib/core-modules/ai/ai-service");

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGenerate = AIService.generate as jest.MockedFunction<
  typeof AIService.generate
>;

// モックセッション
const mockSession = {
  user: { id: "user-1", email: "test@example.com", role: "USER" },
  expires: "2099-01-01",
};

// リクエスト作成ヘルパー
const createRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/ai/services/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/ai/services/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  describe("認証", () => {
    it("認証なしの場合 401 エラー", async () => {
      mockAuth.mockResolvedValue(null as never);

      const response = await POST(
        createRequest({ input: "test", systemPrompt: "test" }),
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("バリデーション", () => {
    it("input が未指定の場合 400 エラー", async () => {
      const response = await POST(createRequest({ systemPrompt: "test" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("input");
    });

    it("systemPrompt が未指定の場合 400 エラー", async () => {
      const response = await POST(createRequest({ input: "test" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("systemPrompt");
    });

    it("temperature が範囲外の場合 400 エラー", async () => {
      const response = await POST(
        createRequest({ input: "test", systemPrompt: "test", temperature: 3 }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("temperature");
    });

    it("maxTokens が範囲外の場合 400 エラー", async () => {
      const response = await POST(
        createRequest({
          input: "test",
          systemPrompt: "test",
          maxTokens: 99999,
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("maxTokens");
    });
  });

  describe("正常系", () => {
    it("正常リクエストで output, provider, model を返す", async () => {
      mockGenerate.mockResolvedValue({
        output: "Generated text",
        provider: "local",
        model: "llama.cpp/test-model",
      });

      const response = await POST(
        createRequest({ input: "test input", systemPrompt: "test prompt" }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("output");
      expect(json).toHaveProperty("provider");
      expect(json).toHaveProperty("model");
      expect(json.output).toBe("Generated text");
    });

    it("オプションパラメータが正しく渡される", async () => {
      mockGenerate.mockResolvedValue({
        output: "Response",
        provider: "local",
        model: "test",
      });

      await POST(
        createRequest({
          input: "test",
          systemPrompt: "test",
          temperature: 0.5,
          maxTokens: 500,
        }),
      );

      expect(mockGenerate).toHaveBeenCalledWith({
        input: "test",
        systemPrompt: "test",
        temperature: 0.5,
        maxTokens: 500,
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("AIService エラー時に 500 エラー", async () => {
      mockGenerate.mockRejectedValue(new Error("AI service error"));

      const response = await POST(
        createRequest({ input: "test", systemPrompt: "test" }),
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("AI service error");
    });
  });
});
