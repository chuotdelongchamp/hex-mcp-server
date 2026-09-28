# hex-mcp-server

A standalone [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Hex](https://hex.tech) API. Zero dependencies, runs anywhere Node.js is available.

Connect your AI assistant (Cortex Code, Claude Desktop, Cursor, etc.) to your Hex workspace to audit projects, users, data connections, trigger runs, and more.

## Features

- **17 tools** covering the most useful Hex API endpoints
- **Zero npm dependencies** — single self-contained Node.js file
- **MCP-native** — JSON-RPC 2.0 over stdio, works with any MCP client
- **Cursor-based pagination** on all list endpoints
- **Sensitive token handling** — token never hardcoded, passed via environment variable

## Tools

| Tool | Description |
|---|---|
| `hex-get-me` | Get current authenticated user (validates token) |
| `hex-list-users` | List workspace users (paginated) |
| `hex-list-projects` | List all projects with filters (status, category, creator, owner) |
| `hex-get-project` | Get detailed project metadata |
| `hex-list-groups` | List workspace groups |
| `hex-get-group` | Get group details with members |
| `hex-list-collections` | List workspace collections |
| `hex-list-data-connections` | List all data connections |
| `hex-get-data-connection` | Get data connection details |
| `hex-run-project` | Trigger a published project run |
| `hex-get-run-status` | Check status of a project run |
| `hex-get-project-runs` | List runs for a project (filter by status/trigger) |
| `hex-cancel-run` | Cancel an active project run |
| `hex-list-cells` | List cells in a project (code, SQL, markdown) |
| `hex-get-queried-tables` | Get warehouse tables queried by a project (Enterprise) |
| `hex-list-threads` | List agent threads |
| `hex-get-thread` | Get agent thread details |

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

## Hex API Coverage

This server covers the most commonly needed endpoints. The full Hex API has 58 endpoints — contributions to add more are welcome. See the [Hex API Reference](https://learn.hex.tech/docs/api-integrations/api/reference) for the complete list.

### Not yet implemented (PRs welcome)

- Create/edit/delete projects, groups, collections
- Project sharing management
- Data connection creation and credential rotation
- Guides management
- Suggestions and review workflows
- Semantic models
- Embedded URLs

## Requirements

- Node.js 18+ (no npm install needed)

## License

MIT
