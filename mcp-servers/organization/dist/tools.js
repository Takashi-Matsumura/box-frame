/**
 * MCPツール定義（読み取り専用）
 */
export const tools = [
    {
        name: "org_check_status",
        description: "データベースの接続状態を確認します。接続が利用可能かどうかとPUBLISHED組織の有無を返します。",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "org_get_structure",
        description: "組織階層ツリーを取得します。本部→部→課の階層構造で、各レベルの社員数と管理者情報を含みます。",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "org_list_departments",
        description: "本部一覧を取得します。各本部の社員数、管理者情報、配下の部数を含みます。",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "org_list_employees",
        description: "社員一覧を取得します。本部・部・課でフィルタリングでき、ページネーションに対応しています。",
        inputSchema: {
            type: "object",
            properties: {
                departmentId: {
                    type: "string",
                    description: "本部IDでフィルタ",
                },
                sectionId: {
                    type: "string",
                    description: "部IDでフィルタ",
                },
                courseId: {
                    type: "string",
                    description: "課IDでフィルタ",
                },
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
        name: "org_get_employee",
        description: "社員の詳細情報を取得します。社員番号またはUUIDで指定できます。所属部署や管理者情報も含まれます。",
        inputSchema: {
            type: "object",
            properties: {
                employeeId: {
                    type: "string",
                    description: "社員番号（例: EMP001）",
                },
                id: {
                    type: "string",
                    description: "UUID（employeeIdが未指定の場合に使用）",
                },
            },
            required: [],
        },
    },
    {
        name: "org_search_employees",
        description: "社員を検索します。名前、メールアドレス、社員番号で部分一致検索できます。",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "検索クエリ（部分一致）",
                },
            },
            required: ["query"],
        },
    },
];
