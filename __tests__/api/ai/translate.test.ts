/**
 * /api/ai/translate API契約テスト
 *
 * 仕様: CLAUDE.md「生成AI - API」
 *
 * GET: AI翻訳が利用可能か確認
 * POST: テキストを翻訳
 *
 * リクエスト (POST):
 *   text: string (必須)
 *   sourceLanguage: "ja" | "en" (必須)
 *   targetLanguage: "ja" | "en" (必須)
 *
 * レスポンス (POST):
 *   translatedText: string
 *   provider: string
 *   model: string
 */

import { GET, POST } from "@/app/api/ai/translate/route";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

// モック
jest.mock("@/auth");
jest.mock("@/lib/core-modules/ai");

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockIsAvailable = AIService.isAvailable as jest.MockedFunction<
  typeof AIService.isAvailable
>;
const mockTranslate = AIService.translate as jest.MockedFunction<
  typeof AIService.translate
>;

// モックセッション
const mockSession = {
  user: { id: "user-1", email: "test@example.com", role: "USER" },
  expires: "2099-01-01",
};

// リクエスト作成ヘルパー
const _createGetRequest = () =>
  new Request("http://localhost:3000/api/ai/translate", { method: "GET" });

const createPostRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/ai/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/ai/translate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  describe("GET", () => {
    it("認証なしの場合 401 エラー", async () => {
      mockAuth.mockResolvedValue(null as never);

      const response = await GET();

      expect(response.status).toBe(401);
    });

    it("AI が利用可能な場合 available: true を返す", async () => {
      mockIsAvailable.mockResolvedValue(true);

      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.available).toBe(true);
    });

    it("AI が利用不可の場合 available: false を返す", async () => {
      mockIsAvailable.mockResolvedValue(false);

      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.available).toBe(false);
    });
  });

  describe("POST", () => {
    describe("認証", () => {
      it("認証なしの場合 401 エラー", async () => {
        mockAuth.mockResolvedValue(null as never);

        const response = await POST(
          createPostRequest({
            text: "こんにちは",
            sourceLanguage: "ja",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(401);
      });
    });

    describe("バリデーション", () => {
      it("text が未指定の場合 400 エラー", async () => {
        const response = await POST(
          createPostRequest({
            sourceLanguage: "ja",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("text");
      });

      it("sourceLanguage が未指定の場合 400 エラー", async () => {
        const response = await POST(
          createPostRequest({
            text: "こんにちは",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("sourceLanguage");
      });

      it("targetLanguage が未指定の場合 400 エラー", async () => {
        const response = await POST(
          createPostRequest({
            text: "こんにちは",
            sourceLanguage: "ja",
          }),
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("targetLanguage");
      });

      it("sourceLanguage が不正な値の場合 400 エラー", async () => {
        const response = await POST(
          createPostRequest({
            text: "test",
            sourceLanguage: "fr",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("sourceLanguage");
      });

      it("targetLanguage が不正な値の場合 400 エラー", async () => {
        const response = await POST(
          createPostRequest({
            text: "test",
            sourceLanguage: "ja",
            targetLanguage: "fr",
          }),
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("targetLanguage");
      });
    });

    describe("正常系", () => {
      it("日本語から英語への翻訳が成功", async () => {
        mockTranslate.mockResolvedValue({
          translatedText: "Hello",
          provider: "local",
          model: "llama.cpp/test-model",
        });

        const response = await POST(
          createPostRequest({
            text: "こんにちは",
            sourceLanguage: "ja",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json).toHaveProperty("translatedText");
        expect(json).toHaveProperty("provider");
        expect(json).toHaveProperty("model");
        expect(json.translatedText).toBe("Hello");
      });

      it("英語から日本語への翻訳が成功", async () => {
        mockTranslate.mockResolvedValue({
          translatedText: "こんにちは",
          provider: "local",
          model: "test",
        });

        const response = await POST(
          createPostRequest({
            text: "Hello",
            sourceLanguage: "en",
            targetLanguage: "ja",
          }),
        );

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.translatedText).toBe("こんにちは");
      });

      it("パラメータが正しく AIService に渡される", async () => {
        mockTranslate.mockResolvedValue({
          translatedText: "Test",
          provider: "local",
          model: "test",
        });

        await POST(
          createPostRequest({
            text: "テスト",
            sourceLanguage: "ja",
            targetLanguage: "en",
          }),
        );

        expect(mockTranslate).toHaveBeenCalledWith({
          text: "テスト",
          sourceLanguage: "ja",
          targetLanguage: "en",
        });
      });
    });

    describe("エラーハンドリング", () => {
      it("AIService エラー時に 500 エラー", async () => {
        mockTranslate.mockRejectedValue(new Error("Translation failed"));

        const response = await POST(
          createPostRequest({
            text: "test",
            sourceLanguage: "ja",
            targetLanguage: "en",
          }),
        );

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.error).toBe("Translation failed");
      });
    });
  });
});
