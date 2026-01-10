#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LdapClient } from "./ldap-client.js";
import { tools } from "./tools.js";

/**
 * OpenLDAP MCP Server
 *
 * BoxFrameのOpenLDAPモジュールを外部の生成AIから利用可能にするMCPサーバ。
 * 読み取り専用で、ユーザー情報の取得・検索のみをサポート。
 */
class OpenLdapMcpServer {
  server;
  ldapClient;
  constructor() {
    this.server = new Server(
      {
        name: "openldap-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    // 環境変数からLDAPクライアントを初期化
    this.ldapClient = LdapClient.createFromEnv();
    this.setupHandlers();
  }
  setupHandlers() {
    // ツール一覧を返す
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));
    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case "ldap_check_status":
            return await this.handleCheckStatus();
          case "ldap_list_users":
            return await this.handleListUsers(args);
          case "ldap_get_user":
            return await this.handleGetUser(args);
          case "ldap_search_users":
            return await this.handleSearchUsers(args);
          case "ldap_user_exists":
            return await this.handleUserExists(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
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
  async handleCheckStatus() {
    const isAvailable = await this.ldapClient.isAvailable();
    const serverInfo = this.ldapClient.getServerInfo();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              isAvailable,
              serverInfo,
              message: isAvailable
                ? "OpenLDAP server is available"
                : "OpenLDAP server is not available",
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  async handleListUsers(args) {
    const result = await this.ldapClient.listUsers({
      limit: args.limit,
      offset: args.offset,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
  async handleGetUser(args) {
    if (!args.uid) {
      throw new Error("uid is required");
    }
    const result = await this.ldapClient.getUser(args.uid);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
  async handleSearchUsers(args) {
    if (!args.query) {
      throw new Error("query is required");
    }
    const result = await this.ldapClient.searchUsers(args.query);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
  async handleUserExists(args) {
    if (!args.uid) {
      throw new Error("uid is required");
    }
    const exists = await this.ldapClient.userExists(args.uid);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              uid: args.uid,
              exists,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("OpenLDAP MCP Server running on stdio");
  }
}
// サーバー起動
const server = new OpenLdapMcpServer();
server.run().catch(console.error);
