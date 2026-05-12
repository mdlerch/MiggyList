# MiggyList MCP Server

Exposes your MiggyList tasks to AI agents via the [Model Context Protocol](https://modelcontextprotocol.io). Works with Claude Code, Gemini CLI, and any other MCP-compatible client.

## Setup

### 1. Install dependencies

```bash
cd mcp && npm install
```

### 2. Configure credentials

Create a `.mcp.json` file at the repo root (it's gitignored — don't commit it):

```json
{
  "mcpServers": {
    "miggylist": {
      "command": "node",
      "args": ["/path/to/MiggyList/mcp/server.js"],
      "env": {
        "MIGGYLIST_USERNAME": "your-username",
        "MIGGYLIST_PASSWORD": "your-password"
      }
    }
  }
}
```

Use the **absolute path** to `server.js` on your machine.

The MiggyList Express server must be running for the MCP server to connect. Start it from the **repo root** (not the `mcp/` directory):

```bash
cd /path/to/MiggyList && npm run server
```

### 3. Reload MCP servers in Claude Code

Run `/mcp` in Claude Code to confirm the `miggylist` server is connected and its tools are listed.

---

## Using it in Claude Code

Once connected, just talk naturally. Claude will call the right tools automatically.

**Capture tasks:**
> "Add a task called 'Review Q2 budget' to my inbox on the Work board."

**Query:**
> "What's in my inbox right now?"
> "Show me everything on the Personal board."

**Triage:**
> "Go through my inbox and move anything that's a long boring task to Slog, anything exciting to Spark, and anything I should do today to In Progress."

**Bulk update:**
> "Set everything in my inbox that's due this week to High priority."

---

## Available tools

| Tool | What it does |
|---|---|
| `list_boards` | List all your boards |
| `get_board` | Get a board with all its groups and items |
| `get_inbox` | Get all Inbox-status tasks across every board |
| `create_item` | Create a new task in a specific group |
| `update_item` | Update any fields on a task (status, priority, due date, etc.) |
| `move_item` | Move a task to a different group |
| `archive_item` | Archive a task |
| `delete_item` | Permanently delete a task |

Valid status values: `Inbox`, `Spark`, `Slog`, `In Progress`, `Done`

Valid priority values: `Low`, `Medium`, `High`, `Critical`

---

## Troubleshooting

**`miggylist` doesn't appear in `/mcp`**
- Check that `.claude/settings.json` has your credentials filled in (not empty strings).
- Make sure the path in `args` is correct for your machine.
- Reload with `/mcp` after editing settings.

**"Authentication failed" on startup**
- Verify your username and password match what you use to log into MiggyList.

**Tool calls fail mid-session**
- The Express server (`npm run server`) is probably not running. Start it and try again.
