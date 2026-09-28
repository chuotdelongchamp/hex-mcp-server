#!/usr/bin/env node
"use strict";

// Hex MCP Server — standalone, zero-dependency MCP server for Hex API
// Implements MCP protocol (JSON-RPC 2.0 over stdio) with all major Hex API endpoints.

const https = require("https");
const http = require("http");
const { URL } = require("url");

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.HEX_BASE_URL || "https://app.hex.tech").replace(/\/+$/, "");
const API_TOKEN = process.env.HEX_API_TOKEN || "";
const API_PREFIX = `${BASE_URL}/api/v1`;

// ── HTTP helpers ────────────────────────────────────────────────────────────
function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_PREFIX}${path}`);
    const mod = url.protocol === "https:" ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function qs(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

// ── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "hex-get-me",
    description: "Get the currently authenticated Hex user (validates token).",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => apiRequest("GET", "/users/me"),
  },
  {
    name: "hex-list-users",
    description: "List all users in the Hex workspace. Supports pagination (limit, after).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Page size (1-100, default 25)" },
        after: { type: "string", description: "Pagination cursor" },
        sortBy: { type: "string", enum: ["CREATED_AT"], description: "Sort field" },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/users${qs(p)}`),
  },
  {
    name: "hex-list-projects",
    description: "List all viewable projects. Supports filtering by status, category, creator, owner, collection.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Page size (1-100, default 25)" },
        after: { type: "string", description: "Pagination cursor" },
        sortBy: { type: "string", enum: ["CREATED_AT", "LAST_EDITED_AT", "LAST_PUBLISHED_AT"] },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
        includeSharing: { type: "boolean", description: "Include sharing metadata" },
        includeArchived: { type: "boolean" },
        includeTrashed: { type: "boolean" },
        includeUnlisted: { type: "boolean" },
        statuses: { type: "string", description: "Comma-separated status names" },
        categories: { type: "string", description: "Comma-separated category names" },
        creatorEmail: { type: "string" },
        ownerEmail: { type: "string" },
        collectionId: { type: "string" },
      },
    },
    handler: async (p) => apiRequest("GET", `/projects${qs(p)}`),
  },
  {
    name: "hex-get-project",
    description: "Get detailed metadata for a single Hex project by ID.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The Hex project UUID" },
        includeSharing: { type: "boolean", description: "Include sharing metadata (default false)" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...rest } = p;
      return apiRequest("GET", `/projects/${projectId}${qs(rest)}`);
    },
  },
  {
    name: "hex-list-groups",
    description: "List all groups in the Hex workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
        sortBy: { type: "string", enum: ["CREATED_AT"] },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/groups${qs(p)}`),
  },
  {
    name: "hex-get-group",
    description: "Get details of a single group by ID, including members.",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The group UUID" },
      },
      required: ["groupId"],
    },
    handler: async ({ groupId }) => apiRequest("GET", `/groups/${groupId}`),
  },
  {
    name: "hex-list-collections",
    description: "List all collections in the Hex workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
        sortBy: { type: "string", enum: ["CREATED_AT"] },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/collections${qs(p)}`),
  },
  {
    name: "hex-list-data-connections",
    description: "List all data connections configured in the Hex workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
        sortBy: { type: "string", enum: ["CREATED_AT"] },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/data-connections${qs(p)}`),
  },
  {
    name: "hex-get-data-connection",
    description: "Get details of a single data connection by ID.",
    inputSchema: {
      type: "object",
      properties: {
        dataConnectionId: { type: "string", description: "The data connection UUID" },
      },
      required: ["dataConnectionId"],
    },
    handler: async ({ dataConnectionId }) =>
      apiRequest("GET", `/data-connections/${dataConnectionId}`),
  },
  {
    name: "hex-run-project",
    description:
      "Trigger a run of a published Hex project. Optionally provide input parameters and cache control.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project UUID" },
        inputParams: {
          type: "object",
          description: "Key-value input parameters for the project run",
        },
        updatePublishedResults: {
          type: "boolean",
          description: "Update the published app cache with run results (default false)",
        },
        useCachedSqlResults: {
          type: "boolean",
          description: "Use cached SQL results (default true). Set false to force fresh queries.",
        },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("POST", `/projects/${projectId}/runs`, body);
    },
  },
  {
    name: "hex-get-run-status",
    description: "Get the status of a specific project run.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        runId: { type: "string" },
      },
      required: ["projectId", "runId"],
    },
    handler: async ({ projectId, runId }) =>
      apiRequest("GET", `/projects/${projectId}/runs/${runId}`),
  },
  {
    name: "hex-get-project-runs",
    description:
      "List all API-triggered runs for a project. Filter by status or trigger type.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        limit: { type: "integer" },
        offset: { type: "integer" },
        statusFilter: {
          type: "string",
          enum: ["PENDING", "RUNNING", "ERRORED", "COMPLETED", "KILLED", "UNABLE_TO_ALLOCATE_KERNEL"],
        },
        runTriggerFilter: { type: "string", enum: ["SCHEDULED", "API", "APP_REFRESH", "ALL"] },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...rest } = p;
      return apiRequest("GET", `/projects/${projectId}/runs${qs(rest)}`);
    },
  },
  {
    name: "hex-cancel-run",
    description: "Cancel an active project run.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        runId: { type: "string" },
      },
      required: ["projectId", "runId"],
    },
    handler: async ({ projectId, runId }) =>
      apiRequest("DELETE", `/projects/${projectId}/runs/${runId}`),
  },
  {
    name: "hex-list-cells",
    description: "List cells (code, SQL, markdown) from the draft version of a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project UUID" },
        limit: { type: "integer" },
        after: { type: "string" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...rest } = p;
      return apiRequest("GET", `/cells${qs({ projectId, ...rest })}`);
    },
  },
  {
    name: "hex-get-queried-tables",
    description:
      "Get the list of warehouse tables queried by a project (Enterprise plan only).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
      },
      required: ["projectId"],
    },
    handler: async ({ projectId }) =>
      apiRequest("GET", `/projects/${projectId}/queriedTables`),
  },
  {
    name: "hex-list-threads",
    description: "List agent threads in the workspace. Filter by source, user, type.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
        source: { type: "string", enum: ["HEX", "SLACK", "MCP", "PUBLIC_API"] },
        userId: { type: "string" },
        type: { type: "string", enum: ["THREADS", "NOTEBOOK", "MODELING"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/threads${qs(p)}`),
  },
  {
    name: "hex-get-thread",
    description: "Get details and status of an agent thread.",
    inputSchema: {
      type: "object",
      properties: {
        threadId: { type: "string" },
      },
      required: ["threadId"],
    },
    handler: async ({ threadId }) => apiRequest("GET", `/threads/${threadId}`),
  },
];

// ── MCP Protocol (JSON-RPC 2.0 over stdio) ─────────────────────────────────
const SERVER_INFO = {
  name: "hex-mcp",
  version: "0.1.0",
};

const CAPABILITIES = {
  tools: {},
};

function handleRequest(msg) {
  const { method, params, id } = msg;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: SERVER_INFO,
          capabilities: CAPABILITIES,
        },
      };

    case "notifications/initialized":
      return null; // notification, no response

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find((t) => t.name === toolName);

      if (!tool) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          },
        };
      }

      // Return a promise — handled in the async message loop
      return tool
        .handler(toolArgs)
        .then((result) => ({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          },
        }))
        .catch((err) => ({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: `Error: ${err.message}` }],
          },
        }));
    }

    case "ping":
      return { jsonrpc: "2.0", id, result: {} };

    default:
      // Unknown method — return error per JSON-RPC spec
      if (id !== undefined) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }
      return null; // unknown notification, ignore
  }
}

// ── Stdio transport ─────────────────────────────────────────────────────────
function send(obj) {
  if (obj) {
    const json = JSON.stringify(obj);
    process.stdout.write(`${json}\n`);
  }
}

let buffer = "";
let pendingOps = 0;
let stdinEnded = false;

function maybeExit() {
  if (stdinEnded && pendingOps === 0) process.exit(0);
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      const result = handleRequest(msg);
      if (result && typeof result.then === "function") {
        pendingOps++;
        result.then(send).catch(() => {}).finally(() => { pendingOps--; maybeExit(); });
      } else {
        send(result);
      }
    } catch (e) {
      send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${e.message}` },
      });
    }
  }
});

process.stdin.on("end", () => { stdinEnded = true; maybeExit(); });

// Prevent unhandled promise rejections from crashing the server
process.on("unhandledRejection", (err) => {
  process.stderr.write(`[hex-mcp] Unhandled rejection: ${err}\n`);
});

process.stderr.write(`[hex-mcp] Server started (base: ${BASE_URL})\n`);
