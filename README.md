# hex-mcp-server

A standalone [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Hex](https://hex.tech) API. Zero dependencies, runs anywhere Node.js is available.

Connect your AI assistant (Cortex Code, Claude Desktop, Cursor, etc.) to your Hex workspace to audit projects, users, data connections, trigger runs, and more.

## Features

- **58 tools** covering the entire Hex public API
- **Zero npm dependencies** — single self-contained Node.js file
- **MCP-native** — JSON-RPC 2.0 over stdio, works with any MCP client
- **Cursor-based pagination** on all list endpoints
- **Sensitive token handling** — token never hardcoded, passed via environment variable

## Tools

### Users

| Tool | Description |
|---|---|
| `hex-get-me` | Get current authenticated user (validates token) |
| `hex-list-users` | List workspace users (paginated) |
| `hex-deactivate-user` | Deactivate a user (their tokens stop working) |

### Projects

| Tool | Description |
|---|---|
| `hex-list-projects` | List all projects with filters (status, category, creator, owner) |
| `hex-get-project` | Get detailed project metadata |
| `hex-create-project` | Create a new project |
| `hex-update-project` | Add/remove status or endorsements |
| `hex-export-project` | Export a project as `.hex.yaml` |
| `hex-batch-update-compute-profile` | Batch update kernel image/size on multiple projects |

### Project Runs

| Tool | Description |
|---|---|
| `hex-run-project` | Trigger a published project run |
| `hex-get-run-status` | Check status of a project run |
| `hex-get-project-runs` | List runs for a project (filter by status/trigger) |
| `hex-cancel-run` | Cancel an active project run |
| `hex-get-queried-tables` | Get warehouse tables queried by a project (Enterprise) |
| `hex-get-chart-image-from-run` | Get PNG of a chart cell from a completed run |

### Project Sharing

| Tool | Description |
|---|---|
| `hex-edit-project-sharing-collections` | Add/remove project from collections |
| `hex-edit-project-sharing-groups` | Add/update/remove group sharing access |
| `hex-edit-project-sharing-users` | Add/update/remove user sharing access |
| `hex-edit-project-sharing-workspace` | Update workspace or public-web sharing |

### Cells

| Tool | Description |
|---|---|
| `hex-list-cells` | List cells in a project (code, SQL, markdown) |
| `hex-get-cell` | Get a single cell by ID |
| `hex-create-cell` | Create a new cell in project draft |
| `hex-update-cell` | Update cell source and/or data connection |
| `hex-delete-cell` | Delete a cell from project draft |
| `hex-get-chart-image-from-logic` | Get rendered PNG of a chart cell from draft |
| `hex-get-cell-output` | Get cell output (unstable) |

### Groups

| Tool | Description |
|---|---|
| `hex-list-groups` | List workspace groups |
| `hex-get-group` | Get group details with members |
| `hex-create-group` | Create a new group |
| `hex-edit-group` | Edit group name/members |
| `hex-delete-group` | Delete a group |

### Collections

| Tool | Description |
|---|---|
| `hex-list-collections` | List workspace collections |
| `hex-get-collection` | Get collection details |
| `hex-create-collection` | Create a new collection |
| `hex-edit-collection` | Edit collection name/description/sharing |

### Data Connections

| Tool | Description |
|---|---|
| `hex-list-data-connections` | List all data connections |
| `hex-get-data-connection` | Get data connection details |
| `hex-create-data-connection` | Create a new data connection |
| `hex-edit-data-connection` | Edit connection details/credentials/sharing |
| `hex-update-data-connection-schema` | Add/remove endorsements on schemas/tables |

### Embedding

| Tool | Description |
|---|---|
| `hex-create-presigned-url` | Create an embedded URL for iframe embedding |

### Agent Threads

| Tool | Description |
|---|---|
| `hex-list-threads` | List agent threads (filter by source, user, type) |
| `hex-get-thread` | Get thread details and status |
| `hex-create-thread` | Start a new agent thread with a prompt |
| `hex-continue-thread` | Send a follow-up prompt to an idle thread |
| `hex-get-thread-messages` | List messages in a thread |
| `hex-list-topics` | List thread topics in the workspace |

### Guides

| Tool | Description |
|---|---|
| `hex-upsert-guide-draft` | Create or update guide drafts |
| `hex-list-draft-guides` | List draft guides |
| `hex-delete-guide-draft` | Delete a guide draft |
| `hex-publish-guide-drafts` | Publish all drafted guides |

### Semantic Projects

| Tool | Description |
|---|---|
| `hex-update-semantic-project` | Add/remove statuses from datasets and views |
| `hex-ingest-semantic-project` | Ingest a semantic project |

### Suggestions

| Tool | Description |
|---|---|
| `hex-list-suggestions` | List context suggestions |
| `hex-get-suggestion` | Get suggestion with evidence and proposed changes |
| `hex-update-suggestion` | Update suggestion status |
| `hex-update-suggestion-change` | Update status of an individual proposed change |
| `hex-trigger-suggestion-review` | Trigger a background review agent run |

## Quick Start

### 1. Get a Hex API token

Go to **Hex > Settings > API Keys** and create a Personal Access Token (`hxtp_...`) or a Workspace Token (`hxtw_...`).

### 2. Configure your MCP client

#### Cortex Code / Claude Desktop / Cursor

Add to your MCP config file:

```json
{
  "servers": {
    "hex": {
      "command": "node",
      "args": ["/path/to/hex-mcp-server/build/index.js"],
      "env": {
        "HEX_BASE_URL": "https://app.hex.tech",
        "HEX_API_TOKEN": "hxtw_your_token_here"
      }
    }
  }
}
```

> **EU customers**: Use `https://eu.hex.tech` as the base URL.  
> **Single-tenant**: Use your custom Hex domain (e.g., `https://yourorg.hex.tech`).

### 3. Restart your MCP client

The Hex tools will appear automatically.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HEX_API_TOKEN` | Yes | Hex API token (`hxtp_...` or `hxtw_...`) |
| `HEX_BASE_URL` | No | Hex instance URL (default: `https://app.hex.tech`) |

## API Coverage

This server implements all 58 endpoints of the [Hex Public API](https://learn.hex.tech/docs/api-integrations/api/reference). Some endpoints may require specific token scopes or plan levels (Team/Enterprise).

## Requirements

- Node.js 18+ (no npm install needed)

## License

MIT
