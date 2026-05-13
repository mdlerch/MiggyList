import express from "express";
import { register as registerMiggyList } from "./apps/miggylist.js";

const PORT = parseInt(process.env.PORT ?? "3005");

const app = express();
app.use(express.json());

// Register MCP apps — add new ones here as needed:
await registerMiggyList(app, "miggylist");
// await registerOtherApp(app, "otherapp");

app.listen(PORT, () => {
  process.stderr.write(`MCP server listening on port ${PORT}\n`);
});
