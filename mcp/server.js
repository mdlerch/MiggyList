import express from "express";
import { register as registerMiggyList } from "./apps/miggylist.js";

const PORT = parseInt(process.env.PORT ?? "3002");

// The path prefix this server sits behind in NGINX (e.g. /mcp).
// Used to build the correct messages endpoint URL sent to MCP clients.
const EXTERNAL_BASE = process.env.MCP_BASE_PATH ?? "/mcp";

const app = express();
app.use(express.json());

// Register MCP apps — add new ones here as needed:
await registerMiggyList(app, "miggylist", EXTERNAL_BASE);
// await registerOtherApp(app, "otherapp", EXTERNAL_BASE);

app.listen(PORT, () => {
  process.stderr.write(`MCP server listening on port ${PORT}\n`);
});
