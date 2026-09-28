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

  // ── Cells (CRUD) ──────────────────────────────────────────────────────────
  {
    name: "hex-create-cell",
    description: "Create a new cell in the draft version of a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project UUID" },
        cellType: { type: "string", enum: ["CODE", "SQL", "MARKDOWN", "INPUT", "WRITEBACK"], description: "Type of cell" },
        source: { type: "string", description: "Cell source content" },
        afterCellId: { type: "string", description: "Insert after this cell ID" },
      },
      required: ["projectId", "cellType"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("POST", `/cells${qs({ projectId })}`, body);
    },
  },
  {
    name: "hex-get-cell",
    description: "Get a single cell by ID.",
    inputSchema: {
      type: "object",
      properties: { cellId: { type: "string" } },
      required: ["cellId"],
    },
    handler: async ({ cellId }) => apiRequest("GET", `/cells/${cellId}`),
  },
  {
    name: "hex-update-cell",
    description: "Update a cell's source and/or data connection.",
    inputSchema: {
      type: "object",
      properties: {
        cellId: { type: "string" },
        source: { type: "string", description: "New cell source content" },
        dataConnectionId: { type: "string", description: "Data connection UUID for SQL cells" },
      },
      required: ["cellId"],
    },
    handler: async (p) => {
      const { cellId, ...body } = p;
      return apiRequest("PATCH", `/cells/${cellId}`, body);
    },
  },
  {
    name: "hex-delete-cell",
    description: "Delete a cell from the draft version of a project.",
    inputSchema: {
      type: "object",
      properties: { cellId: { type: "string" } },
      required: ["cellId"],
    },
    handler: async ({ cellId }) => apiRequest("DELETE", `/cells/${cellId}`),
  },
  {
    name: "hex-get-chart-image-from-logic",
    description: "Get rendered PNG of a chart cell from the draft session.",
    inputSchema: {
      type: "object",
      properties: {
        cellId: { type: "string" },
        width: { type: "integer", description: "Image width (100-2000)" },
        height: { type: "integer", description: "Image height (100-2000)" },
      },
      required: ["cellId"],
    },
    handler: async ({ cellId, ...rest }) => apiRequest("GET", `/cells/${cellId}/image${qs(rest)}`),
  },
  {
    name: "hex-get-cell-output",
    description: "Get cell output (unstable API). Returns the output of a cell.",
    inputSchema: {
      type: "object",
      properties: { cellId: { type: "string" } },
      required: ["cellId"],
    },
    handler: async ({ cellId }) => apiRequest("GET", `/cells/${cellId}/output`),
  },

  // ── Collections (create, get, edit) ───────────────────────────────────────
  {
    name: "hex-create-collection",
    description: "Create a new collection in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Collection name" },
        description: { type: "string" },
        members: { type: "object", description: "Sharing config: { groups: [...], workspace: { members: 'MEMBER' } }" },
      },
      required: ["name"],
    },
    handler: async (body) => apiRequest("POST", "/collections", body),
  },
  {
    name: "hex-get-collection",
    description: "Get details of a single collection by ID.",
    inputSchema: {
      type: "object",
      properties: { collectionId: { type: "string" } },
      required: ["collectionId"],
    },
    handler: async ({ collectionId }) => apiRequest("GET", `/collections/${collectionId}`),
  },
  {
    name: "hex-edit-collection",
    description: "Edit a collection (name, description, sharing).",
    inputSchema: {
      type: "object",
      properties: {
        collectionId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        sharing: { type: "object", description: "Sharing upsert config" },
      },
      required: ["collectionId"],
    },
    handler: async (p) => {
      const { collectionId, ...body } = p;
      return apiRequest("PATCH", `/collections/${collectionId}`, body);
    },
  },

  // ── Context / Topics ──────────────────────────────────────────────────────
  {
    name: "hex-list-topics",
    description: "List thread topics in the workspace, sorted by name.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => apiRequest("GET", "/context/topics"),
  },

  // ── Data Connections (create, edit, schema) ───────────────────────────────
  {
    name: "hex-create-data-connection",
    description: "Create a new data connection in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Connection name" },
        type: { type: "string", description: "Connection type (snowflake, bigquery, postgres, etc.)" },
        description: { type: "string" },
        connectionDetails: { type: "object", description: "Connection details (type-specific)" },
      },
      required: ["name", "type", "connectionDetails"],
    },
    handler: async (body) => apiRequest("POST", "/data-connections", body),
  },
  {
    name: "hex-edit-data-connection",
    description: "Edit a data connection (name, description, credentials, sharing).",
    inputSchema: {
      type: "object",
      properties: {
        dataConnectionId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        connectionDetails: { type: "object", description: "Updated connection details" },
        sharing: { type: "object", description: "Sharing config" },
      },
      required: ["dataConnectionId"],
    },
    handler: async (p) => {
      const { dataConnectionId, ...body } = p;
      return apiRequest("PATCH", `/data-connections/${dataConnectionId}`, body);
    },
  },
  {
    name: "hex-update-data-connection-schema",
    description: "Add/remove statuses (endorsements) from databases, schemas, tables in a data connection.",
    inputSchema: {
      type: "object",
      properties: {
        dataConnectionId: { type: "string" },
        updates: { type: "object", description: "Schema status updates" },
      },
      required: ["dataConnectionId", "updates"],
    },
    handler: async (p) => {
      const { dataConnectionId, ...body } = p;
      return apiRequest("PATCH", `/data-connections/${dataConnectionId}/schema`, body);
    },
  },

  // ── Embedding ─────────────────────────────────────────────────────────────
  {
    name: "hex-create-presigned-url",
    description: "Create an embedded URL for a project (for iframe embedding).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        hexUserAttributes: { type: "object", description: "Attributes for the running user" },
        scope: { type: "array", description: "Permissions: EXPORT_PDF, EXPORT_CSV" },
        inputParameters: { type: "object", description: "Default input parameter values" },
        expiresIn: { type: "number", description: "Expiration in ms (default 15000, max 300000)" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("POST", `/embedding/createPresignedUrl/${projectId}`, body);
    },
  },

  // ── Groups (create, delete, edit) ─────────────────────────────────────────
  {
    name: "hex-create-group",
    description: "Create a new group in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Group name" },
        members: { type: "object", description: "{ users: [{ id: '...' }] }" },
      },
      required: ["name"],
    },
    handler: async (body) => apiRequest("POST", "/groups", body),
  },
  {
    name: "hex-delete-group",
    description: "Delete a group from the workspace.",
    inputSchema: {
      type: "object",
      properties: { groupId: { type: "string" } },
      required: ["groupId"],
    },
    handler: async ({ groupId }) => apiRequest("DELETE", `/groups/${groupId}`),
  },
  {
    name: "hex-edit-group",
    description: "Edit a group (name, members).",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string" },
        name: { type: "string" },
        members: { type: "object", description: "{ add: { users: [...] }, remove: { users: [...] } }" },
      },
      required: ["groupId"],
    },
    handler: async (p) => {
      const { groupId, ...body } = p;
      return apiRequest("PATCH", `/groups/${groupId}`, body);
    },
  },

  // ── Guides ────────────────────────────────────────────────────────────────
  {
    name: "hex-upsert-guide-draft",
    description: "Update or create guide drafts by filePath.",
    inputSchema: {
      type: "object",
      properties: {
        guides: { type: "array", description: "Array of { filePath, content } objects" },
      },
      required: ["guides"],
    },
    handler: async (body) => apiRequest("PUT", "/guides/draft", body),
  },
  {
    name: "hex-list-draft-guides",
    description: "List draft guides (paginated).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
      },
    },
    handler: async (p) => apiRequest("GET", `/guides/draft/list${qs(p)}`),
  },
  {
    name: "hex-delete-guide-draft",
    description: "Delete a guide draft by ID.",
    inputSchema: {
      type: "object",
      properties: { orgGuideFileId: { type: "string" } },
      required: ["orgGuideFileId"],
    },
    handler: async ({ orgGuideFileId }) => apiRequest("DELETE", `/guides/draft/${orgGuideFileId}`),
  },
  {
    name: "hex-publish-guide-drafts",
    description: "Publish all currently drafted guides.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => apiRequest("POST", "/guides/publish"),
  },

  // ── Projects (create, update, export, compute, sharing) ───────────────────
  {
    name: "hex-create-project",
    description: "Create a new project with title and optional description.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
    handler: async (body) => apiRequest("POST", "/projects", body),
  },
  {
    name: "hex-batch-update-compute-profile",
    description: "Batch update kernel image/size on multiple projects.",
    inputSchema: {
      type: "object",
      properties: {
        projectIds: { type: "array", description: "Array of project UUIDs" },
        computeProfile: { type: "object", description: "{ image, size }" },
      },
      required: ["projectIds", "computeProfile"],
    },
    handler: async (body) => apiRequest("POST", "/projects/compute-profile/batch", body),
  },
  {
    name: "hex-export-project",
    description: "Export a project as .hex.yaml format.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
      },
      required: ["projectId"],
    },
    handler: async (body) => apiRequest("POST", "/projects/export", body),
  },
  {
    name: "hex-update-project",
    description: "Add or remove a status (including endorsements) from a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        status: { type: "object", description: "Status to set or remove" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("PATCH", `/projects/${projectId}`, body);
    },
  },
  {
    name: "hex-get-chart-image-from-run",
    description: "Get PNG of a chart cell from a completed project run.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        runId: { type: "string" },
        staticId: { type: "string", description: "Cell static ID" },
        width: { type: "integer" },
        height: { type: "integer" },
      },
      required: ["projectId", "runId", "staticId"],
    },
    handler: async ({ projectId, runId, staticId, ...rest }) =>
      apiRequest("GET", `/projects/${projectId}/runs/${runId}/cells/${staticId}/image${qs(rest)}`),
  },
  {
    name: "hex-edit-project-sharing-collections",
    description: "Add or remove a project from collections.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        add: { type: "array", description: "Collection IDs to add" },
        remove: { type: "array", description: "Collection IDs to remove" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("PATCH", `/projects/${projectId}/sharing/collections`, body);
    },
  },
  {
    name: "hex-edit-project-sharing-groups",
    description: "Add, update, or remove group sharing access for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        upsert: { type: "array", description: "[{ group: { id }, access: 'CAN_EXPLORE'|'CAN_VIEW'|'CAN_EDIT'|'FULL_ACCESS' }]" },
        remove: { type: "array", description: "[{ group: { id } }]" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("PATCH", `/projects/${projectId}/sharing/groups`, body);
    },
  },
  {
    name: "hex-edit-project-sharing-users",
    description: "Add, update, or remove user sharing access for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        upsert: { type: "array", description: "[{ user: { email }, access: 'CAN_EXPLORE'|'CAN_VIEW'|'CAN_EDIT'|'FULL_ACCESS' }]" },
        remove: { type: "array", description: "[{ user: { email } }]" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("PATCH", `/projects/${projectId}/sharing/users`, body);
    },
  },
  {
    name: "hex-edit-project-sharing-workspace",
    description: "Update workspace or public-web sharing settings for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        workspace: { type: "object", description: "{ members: 'CAN_VIEW'|'CAN_EXPLORE'|'NONE' }" },
        publicWeb: { type: "object", description: "{ enabled: boolean }" },
      },
      required: ["projectId"],
    },
    handler: async (p) => {
      const { projectId, ...body } = p;
      return apiRequest("PATCH", `/projects/${projectId}/sharing/workspaceAndPublic`, body);
    },
  },

  // ── Semantic Projects ─────────────────────────────────────────────────────
  {
    name: "hex-update-semantic-project",
    description: "Add/remove statuses from datasets and views in a semantic project.",
    inputSchema: {
      type: "object",
      properties: {
        semanticProjectId: { type: "string" },
        status: { type: "object", description: "Status updates" },
      },
      required: ["semanticProjectId"],
    },
    handler: async (p) => {
      const { semanticProjectId, ...body } = p;
      return apiRequest("PATCH", `/semantic-projects/${semanticProjectId}`, body);
    },
  },
  {
    name: "hex-ingest-semantic-project",
    description: "Ingest a semantic project from uploaded data.",
    inputSchema: {
      type: "object",
      properties: {
        semanticProjectId: { type: "string" },
        data: { type: "object", description: "Ingestion payload" },
      },
      required: ["semanticProjectId"],
    },
    handler: async (p) => {
      const { semanticProjectId, ...body } = p;
      return apiRequest("POST", `/semantic-projects/${semanticProjectId}/ingest`, body);
    },
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  {
    name: "hex-list-suggestions",
    description: "List context suggestions (paginated, filterable by status).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        after: { type: "string" },
        status: { type: "string", enum: ["OPEN", "COMPLETED", "DISMISSED", "IN_PROGRESS", "RESOLVED"] },
        sortBy: { type: "string", enum: ["CREATED_AT"] },
        sortDirection: { type: "string", enum: ["ASC", "DESC"] },
      },
    },
    handler: async (p) => apiRequest("GET", `/suggestions${qs(p)}`),
  },
  {
    name: "hex-get-suggestion",
    description: "Get a suggestion including evidence sources and proposed changes.",
    inputSchema: {
      type: "object",
      properties: { suggestionId: { type: "string" } },
      required: ["suggestionId"],
    },
    handler: async ({ suggestionId }) => apiRequest("GET", `/suggestions/${suggestionId}`),
  },
  {
    name: "hex-update-suggestion",
    description: "Update a suggestion status (OPEN, COMPLETED, DISMISSED, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        suggestionId: { type: "string" },
        status: { type: "string", enum: ["OPEN", "COMPLETED", "DISMISSED", "IN_PROGRESS", "RESOLVED"] },
      },
      required: ["suggestionId", "status"],
    },
    handler: async (p) => {
      const { suggestionId, ...body } = p;
      return apiRequest("POST", `/suggestions/${suggestionId}`, body);
    },
  },
  {
    name: "hex-update-suggestion-change",
    description: "Update the status of an individual proposed change within a suggestion.",
    inputSchema: {
      type: "object",
      properties: {
        suggestionId: { type: "string" },
        changeId: { type: "string" },
        status: { type: "string" },
      },
      required: ["suggestionId", "changeId"],
    },
    handler: async (p) => {
      const { suggestionId, changeId, ...body } = p;
      return apiRequest("POST", `/suggestions/${suggestionId}/changes/${changeId}`, body);
    },
  },
  {
    name: "hex-trigger-suggestion-review",
    description: "Trigger a background review agent run for a suggestion.",
    inputSchema: {
      type: "object",
      properties: { suggestionId: { type: "string" } },
      required: ["suggestionId"],
    },
    handler: async ({ suggestionId }) => apiRequest("POST", `/suggestions/${suggestionId}/review`),
  },

  // ── Threads (create, followup, messages) ──────────────────────────────────
  {
    name: "hex-create-thread",
    description: "Start a new agent thread with a prompt (runs asynchronously).",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The initial prompt for the agent" },
        projectId: { type: "string", description: "Optional project context" },
      },
      required: ["prompt"],
    },
    handler: async (body) => apiRequest("POST", "/threads", body),
  },
  {
    name: "hex-continue-thread",
    description: "Send a follow-up prompt to an idle agent thread.",
    inputSchema: {
      type: "object",
      properties: {
        threadId: { type: "string" },
        prompt: { type: "string", description: "Follow-up prompt" },
      },
      required: ["threadId", "prompt"],
    },
    handler: async (p) => {
      const { threadId, ...body } = p;
      return apiRequest("POST", `/threads/${threadId}/followup`, body);
    },
  },
  {
    name: "hex-get-thread-messages",
    description: "List messages in a thread (chronological, paginated).",
    inputSchema: {
      type: "object",
      properties: {
        threadId: { type: "string" },
        limit: { type: "integer" },
        after: { type: "string" },
      },
      required: ["threadId"],
    },
    handler: async (p) => {
      const { threadId, ...rest } = p;
      return apiRequest("GET", `/threads/${threadId}/messages${qs(rest)}`);
    },
  },

  // ── Users (deactivate) ────────────────────────────────────────────────────
  {
    name: "hex-deactivate-user",
    description: "Deactivate a user in the workspace. Their tokens will stop working.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "string" } },
      required: ["userId"],
    },
    handler: async ({ userId }) => apiRequest("POST", `/users/${userId}/deactivate`),
  },
];

// ── MCP Protocol (JSON-RPC 2.0 over stdio) ─────────────────────────────────
const SERVER_INFO = {
  name: "hex-mcp",
  version: "0.2.0",
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
