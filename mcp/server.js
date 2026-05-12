import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.MIGGYLIST_API_URL ?? "http://localhost:3001";
const USERNAME = process.env.MIGGYLIST_USERNAME;
const PASSWORD = process.env.MIGGYLIST_PASSWORD;

if (!USERNAME || !PASSWORD) {
  process.stderr.write(
    "Error: MIGGYLIST_USERNAME and MIGGYLIST_PASSWORD environment variables are required.\n"
  );
  process.exit(1);
}

// Resolved at startup via login
let userId;

async function login() {
  const res = await fetch(`${API_URL}/miggylist-api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    process.stderr.write(`Authentication failed (${res.status}): ${text}\n`);
    process.exit(1);
  }
  const data = await res.json();
  return data.id;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
}

async function api(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "miggylist",
  version: "1.0.0",
});

// ─── Resources ───────────────────────────────────────────────────────────────

server.resource("boards", "miggylist://boards", async () => {
  const boards = await api("GET", "/miggylist-api/boards");
  return {
    contents: [
      {
        uri: "miggylist://boards",
        mimeType: "application/json",
        text: JSON.stringify(boards, null, 2),
      },
    ],
  };
});

server.resource("inbox", "miggylist://inbox", async () => {
  const data = await api("GET", "/miggylist-api/inbox");
  return {
    contents: [
      {
        uri: "miggylist://inbox",
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

server.resource("stats", "miggylist://stats", async () => {
  const data = await api("GET", "/miggylist-api/stats");
  return {
    contents: [
      {
        uri: "miggylist://stats",
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

server.resource(
  "board",
  new ResourceTemplate("miggylist://boards/{id}", { list: undefined }),
  async (uri, { id }) => {
    const data = await api("GET", `/miggylist-api/boards/${id}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// ─── Tools ───────────────────────────────────────────────────────────────────

server.tool("list_boards", "List all MiggyList boards.", {}, async () => {
  const boards = await api("GET", "/miggylist-api/boards");
  return { content: [{ type: "text", text: JSON.stringify(boards, null, 2) }] };
});

server.tool(
  "get_board",
  "Get a board with all its groups and items.",
  { board_id: z.string().describe("Board ID") },
  async ({ board_id }) => {
    const data = await api("GET", `/miggylist-api/boards/${board_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_inbox",
  "Get all Inbox-status tasks across all boards, with board and group context.",
  {},
  async () => {
    const data = await api("GET", "/miggylist-api/inbox");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const STATUS_VALUES = ["Inbox", "Spark", "Slog", "In Progress", "Done"];
const PRIORITY_VALUES = ["Low", "Medium", "High", "Critical"];

server.tool(
  "create_item",
  "Create a new task in a specific group.",
  {
    board_id: z.string().describe("Board ID"),
    group_id: z.string().describe("Group ID within the board"),
    title: z.string().describe("Task title"),
    status: z
      .enum(["Inbox", "Spark", "Slog", "In Progress", "Done"])
      .optional()
      .describe(`Task status. One of: ${STATUS_VALUES.join(", ")}. Defaults to Inbox.`),
    priority: z
      .enum(["Low", "Medium", "High", "Critical"])
      .optional()
      .describe(`Priority. One of: ${PRIORITY_VALUES.join(", ")}. Defaults to Medium.`),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
    description: z.string().optional().describe("Task description (markdown supported)"),
    points: z.number().int().optional().describe("Story points (integer)"),
  },
  async ({ board_id, group_id, title, status, priority, due_date, description, points }) => {
    const item = await api(
      "POST",
      `/miggylist-api/boards/${board_id}/groups/${group_id}/items`,
      { title, status, priority, due_date, description, points }
    );
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  }
);

server.tool(
  "update_item",
  "Update fields on an existing task.",
  {
    item_id: z.string().describe("Item ID"),
    title: z.string().optional().describe("New title"),
    status: z
      .enum(["Inbox", "Spark", "Slog", "In Progress", "Done"])
      .optional()
      .describe(`New status. One of: ${STATUS_VALUES.join(", ")}`),
    priority: z
      .enum(["Low", "Medium", "High", "Critical"])
      .optional()
      .describe(`New priority. One of: ${PRIORITY_VALUES.join(", ")}`),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD), or empty string to clear"),
    description: z.string().optional().describe("Task description (markdown supported)"),
    points: z.number().int().nullable().optional().describe("Story points, or null to clear"),
    delegated_to: z.string().nullable().optional().describe("Person this is delegated to, or null to clear"),
  },
  async ({ item_id, ...fields }) => {
    const item = await api("PUT", `/miggylist-api/items/${item_id}`, fields);
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  }
);

server.tool(
  "move_item",
  "Move a task to a different group (optionally at a specific position).",
  {
    item_id: z.string().describe("Item ID"),
    to_group_id: z.string().describe("Destination group ID"),
    to_index: z.number().int().optional().describe("Position in the destination group (0-based). Appends if omitted."),
  },
  async ({ item_id, to_group_id, to_index }) => {
    const item = await api("PUT", `/miggylist-api/items/${item_id}/move`, {
      toGroupId: to_group_id,
      toIndex: to_index,
    });
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  }
);

server.tool(
  "archive_item",
  "Archive a task (it can be restored later).",
  { item_id: z.string().describe("Item ID") },
  async ({ item_id }) => {
    const result = await api("POST", `/miggylist-api/items/${item_id}/archive`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "delete_item",
  "Permanently delete a task.",
  { item_id: z.string().describe("Item ID") },
  async ({ item_id }) => {
    const result = await api("DELETE", `/miggylist-api/items/${item_id}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

userId = await login();
process.stderr.write(`MiggyList MCP server authenticated as user ${userId}\n`);

const transport = new StdioServerTransport();
await server.connect(transport);
