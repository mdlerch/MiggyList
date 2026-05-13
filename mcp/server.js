import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./apps/miggylist.js";

const API_URL = process.env.MIGGYLIST_API_URL ?? "http://localhost:3001";
const username = process.env.MIGGYLIST_USERNAME;
const password = process.env.MIGGYLIST_PASSWORD;
if (!username || !password) throw new Error("MIGGYLIST_USERNAME and MIGGYLIST_PASSWORD env vars required");

const loginRes = await fetch(`${API_URL}/miggylist-api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});
if (!loginRes.ok) throw new Error(`Auth failed: ${await loginRes.text()}`);
const { id: userId } = await loginRes.json();

const server = buildServer(userId, API_URL);
await server.connect(new StdioServerTransport());
