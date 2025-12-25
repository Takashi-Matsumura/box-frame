import { type Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCPツール定義（読み取り専用）
 */
export const tools: Tool[] = [
  {
    name: "ldap_check_status",
    description:
      "OpenLDAPサーバの接続状態を確認します。サーバーが利用可能かどうかと接続情報を返します。",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "ldap_list_users",
    description:
      "OpenLDAPに登録されているユーザーの一覧を取得します。ページネーションに対応しています。",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "取得する最大件数（デフォルト: 100）",
        },
        offset: {
          type: "number",
          description: "スキップする件数（デフォルト: 0）",
        },
      },
      required: [],
    },
  },
  {
    name: "ldap_get_user",
    description:
      "指定したユーザーID（uid）のユーザー詳細情報を取得します。",
    inputSchema: {
      type: "object" as const,
      properties: {
        uid: {
          type: "string",
          description: "取得するユーザーのユーザーID（uid）",
        },
      },
      required: ["uid"],
    },
  },
  {
    name: "ldap_search_users",
    description:
      "ユーザーを検索します。uid、cn（名前）、mail（メール）、displayName（表示名）、employeeNumber（社員番号）で部分一致検索できます。",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "検索クエリ（部分一致）",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "ldap_user_exists",
    description:
      "指定したユーザーID（uid）のユーザーが存在するか確認します。",
    inputSchema: {
      type: "object" as const,
      properties: {
        uid: {
          type: "string",
          description: "確認するユーザーのユーザーID（uid）",
        },
      },
      required: ["uid"],
    },
  },
];
