/**
 * Regression test: /health must never expose the configured MCP token.
 */
import { spawn } from "node:child_process";

const token = "health-secret-token-do-not-expose";
const port = 4600 + Math.floor(Math.random() * 200);
const adminPort = port + 1;
const base = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["dist/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    ADMIN_PORT: String(adminPort),
    MCP_TOKEN: token,
    CHATGPT_TOOL_PROFILE: "slim",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
server.stdout?.on("data", (chunk) => (logs += chunk));
server.stderr?.on("data", (chunk) => (logs += chunk));

async function waitForHealth(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return await response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("health endpoint did not become ready");
}

try {
  const health = await waitForHealth();
  const serialized = JSON.stringify(health);
  if (serialized.includes(token)) throw new Error("MCP token leaked in /health response");
  if (logs.includes(token)) throw new Error("MCP token leaked in server startup logs");
  if (health.mcpAuthEnabled !== true) throw new Error("mcpAuthEnabled should be true");
  const expected = ["/<redacted>", "/mcp/<redacted>"];
  if (JSON.stringify(health.mcpEndpoints) !== JSON.stringify(expected)) {
    throw new Error(`unexpected redacted endpoints: ${JSON.stringify(health.mcpEndpoints)}`);
  }
  console.log("OK  MCP token is redacted from /health and startup logs");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    server.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
