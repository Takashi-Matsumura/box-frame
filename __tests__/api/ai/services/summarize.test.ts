/**
 * /api/ai/services/summarize API契約テスト
 *
 * 仕様: CLAUDE.md「外部モジュール向けAPIサービス - 要約」
 *
 * リクエスト:
 *   text: string (必須)
 *   length: "short" | "medium" | "long" (オプション)
 *   language: "ja" | "en" (オプション)
 *
 * レスポンス:
 *   summary: string
 *   provider: string
 *   model: string
 */

import { POST } from "@/app/api/ai/services/summarize/route";
import { AIService } from "@/lib/core-modules/ai";
import { auth } from "@/auth";

// モック
jest.mock("@/auth");
jest.mock("@/lib/core-modules/ai/ai-service");

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockSummarize = AIService.summarize as jest.MockedFunction<typeof AIService.summarize>;

// モックセッション
const mockSession = {
  user: { id: "user-1", email: "test@example.com", role: "USER" },
  expires: "2099-01-01",
};

// リクエスト作成ヘルパー
const createRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/ai/services/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/ai/services/summarize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  describe("認証", () => {
    it("認証なしの場合 401 エラー", async () => {
      mockAuth.mockResolvedValue(null as never);

      const response = await POST(createRequest({ text: "test" }));

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("バリデーション", () => {
    it("text が未指定の場合 400 エラー", async () => {
      const response = await POST(createRequest({}));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("text");
    });

    it("length が不正な値の場合 400 エラー", async () => {
      const response = await POST(
        createRequest({ text: "test", length: "invalid" })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("length");
    });

    it("language が不正な値の場合 400 エラー", async () => {
      const response = await POST(
        createRequest({ text: "test", language: "fr" })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("language");
    });
  });

  describe("正常系", () => {
    it("正常リクエストで summary, provider, model を返す", async () => {
      mockSummarize.mockResolvedValue({
        summary: "This is a summary.",
        provider: "local",
        model: "llama.cpp/test-model",
      });

      const response = await POST(createRequest({ text: "Long text..." }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("summary");
      expect(json).toHaveProperty("provider");
      expect(json).toHaveProperty("model");
      expect(json.summary).toBe("This is a summary.");
    });

    it("length オプションが正しく渡される", async () => {
      mockSummarize.mockResolvedValue({
        summary: "Short",
        provider: "local",
        model: "test",
      });

      await POST(createRequest({ text: "test", length: "short" }));

      expect(mockSummarize).toHaveBeenCalledWith({
        text: "test",
        length: "short",
        language: undefined,
      });
    });

    it("language オプションが正しく渡される", async () => {
      mockSummarize.mockResolvedValue({
        summary: "要約",
        provider: "local",
        model: "test",
      });

      await POST(createRequest({ text: "test", language: "ja" }));

      expect(mockSummarize).toHaveBeenCalledWith({
        text: "test",
        length: undefined,
        language: "ja",
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("AIService エラー時に 500 エラー", async () => {
      mockSummarize.mockRejectedValue(new Error("Summarization failed"));

      const response = await POST(createRequest({ text: "test" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Summarization failed");
    });
  });
});
