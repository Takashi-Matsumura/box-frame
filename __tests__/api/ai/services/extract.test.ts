/**
 * /api/ai/services/extract API契約テスト
 *
 * 仕様: CLAUDE.md「外部モジュール向けAPIサービス - データ抽出」
 *
 * リクエスト:
 *   text: string (必須)
 *   schema: Array<{ name, description, type, required? }> (必須)
 *   language: "ja" | "en" (オプション)
 *
 * レスポンス:
 *   data: Record<string, unknown>
 *   provider: string
 *   model: string
 */

import { POST } from "@/app/api/ai/services/extract/route";
import { AIService } from "@/lib/core-modules/ai";
import { auth } from "@/auth";

// モック
jest.mock("@/auth");
jest.mock("@/lib/core-modules/ai");

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockExtract = AIService.extract as jest.MockedFunction<typeof AIService.extract>;

// モックセッション
const mockSession = {
  user: { id: "user-1", email: "test@example.com", role: "USER" },
  expires: "2099-01-01",
};

// 有効なスキーマ
const validSchema = [
  { name: "name", description: "名前", type: "string" as const },
  { name: "age", description: "年齢", type: "number" as const },
];

// リクエスト作成ヘルパー
const createRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/ai/services/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/ai/services/extract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as never);
  });

  describe("認証", () => {
    it("認証なしの場合 401 エラー", async () => {
      mockAuth.mockResolvedValue(null as never);

      const response = await POST(
        createRequest({ text: "test", schema: validSchema })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("バリデーション", () => {
    it("text が未指定の場合 400 エラー", async () => {
      const response = await POST(createRequest({ schema: validSchema }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("text");
    });

    it("schema が未指定の場合 400 エラー", async () => {
      const response = await POST(createRequest({ text: "test" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("schema");
    });

    it("schema が空配列の場合 400 エラー", async () => {
      const response = await POST(createRequest({ text: "test", schema: [] }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("schema");
    });

    it("schema フィールドに name がない場合 400 エラー", async () => {
      const response = await POST(
        createRequest({
          text: "test",
          schema: [{ description: "desc", type: "string" }],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("name");
    });

    it("schema フィールドに description がない場合 400 エラー", async () => {
      const response = await POST(
        createRequest({
          text: "test",
          schema: [{ name: "field", type: "string" }],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("description");
    });

    it("schema フィールドの type が不正な場合 400 エラー", async () => {
      const response = await POST(
        createRequest({
          text: "test",
          schema: [{ name: "field", description: "desc", type: "invalid" }],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("type");
    });

    it("language が不正な値の場合 400 エラー", async () => {
      const response = await POST(
        createRequest({
          text: "test",
          schema: validSchema,
          language: "fr",
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("language");
    });
  });

  describe("正常系", () => {
    it("正常リクエストで data, provider, model を返す", async () => {
      mockExtract.mockResolvedValue({
        data: { name: "田中太郎", age: 35 },
        provider: "local",
        model: "llama.cpp/test-model",
      });

      const response = await POST(
        createRequest({ text: "田中太郎さんは35歳", schema: validSchema })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("provider");
      expect(json).toHaveProperty("model");
      expect(json.data).toEqual({ name: "田中太郎", age: 35 });
    });

    it("schema と language が正しく渡される", async () => {
      mockExtract.mockResolvedValue({
        data: {},
        provider: "local",
        model: "test",
      });

      await POST(
        createRequest({
          text: "test",
          schema: validSchema,
          language: "ja",
        })
      );

      expect(mockExtract).toHaveBeenCalledWith({
        text: "test",
        schema: validSchema,
        language: "ja",
      });
    });

    it("全ての type が受け入れられる", async () => {
      mockExtract.mockResolvedValue({
        data: {},
        provider: "local",
        model: "test",
      });

      const allTypes = [
        { name: "str", description: "string field", type: "string" },
        { name: "num", description: "number field", type: "number" },
        { name: "bool", description: "boolean field", type: "boolean" },
        { name: "arr", description: "array field", type: "array" },
      ];

      const response = await POST(
        createRequest({ text: "test", schema: allTypes })
      );

      expect(response.status).toBe(200);
    });
  });

  describe("エラーハンドリング", () => {
    it("AIService エラー時に 500 エラー", async () => {
      mockExtract.mockRejectedValue(new Error("Extraction failed"));

      const response = await POST(
        createRequest({ text: "test", schema: validSchema })
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Extraction failed");
    });
  });
});
