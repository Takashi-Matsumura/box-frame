#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DbClient } from "./db-client.js";
import { tools } from "./tools.js";

/**
 * Organization MCP Server
 *
 * BoxFrameの会社組織モジュールを外部の生成AIから利用可能にするMCPサーバ。
 * 読み取り専用で、組織構造と社員情報の取得・検索のみをサポート。
 */
class OrganizationMcpServer {
  private server: Server;
  private dbClient: DbClient;

  constructor() {
    this.server = new Server(
      {
        name: "organization-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // 環境変数からDBクライアントを初期化
    this.dbClient = DbClient.createFromEnv();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧を返す
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "org_check_status":
            return await this.handleCheckStatus();

          case "org_get_structure":
            return await this.handleGetStructure();

          case "org_list_departments":
            return await this.handleListDepartments();

          case "org_list_employees":
            return await this.handleListEmployees(
              args as {
                departmentId?: string;
                sectionId?: string;
                courseId?: string;
                limit?: number;
                offset?: number;
              },
            );

          case "org_get_employee":
            return await this.handleGetEmployee(
              args as { employeeId?: string; id?: string },
            );

          case "org_search_employees":
            return await this.handleSearchEmployees(
              args as { query: string },
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: false, error: errorMessage },
                null,
                2,
              ),
            },
          ],
        };
      }
    });
  }

  private async handleCheckStatus() {
    const isAvailable = await this.dbClient.isAvailable();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              isAvailable,
              message: isAvailable
                ? "Database is available"
                : "Database is not available",
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async handleGetStructure() {
    const result = await this.dbClient.getStructure();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleListDepartments() {
    const result = await this.dbClient.listDepartments();

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleListEmployees(args: {
    departmentId?: string;
    sectionId?: string;
    courseId?: string;
    limit?: number;
    offset?: number;
  }) {
    const result = await this.dbClient.listEmployees({
      departmentId: args.departmentId,
      sectionId: args.sectionId,
      courseId: args.courseId,
      limit: args.limit,
      offset: args.offset,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetEmployee(args: {
    employeeId?: string;
    id?: string;
  }) {
    if (!args.employeeId && !args.id) {
      throw new Error("employeeId or id is required");
    }

    const result = await this.dbClient.getEmployee({
      employeeId: args.employeeId,
      id: args.id,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSearchEmployees(args: { query: string }) {
    if (!args.query) {
      throw new Error("query is required");
    }

    const result = await this.dbClient.searchEmployees(args.query);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Organization MCP Server running on stdio");
  }
}

// サーバー起動
const server = new OrganizationMcpServer();
server.run().catch(console.error);
