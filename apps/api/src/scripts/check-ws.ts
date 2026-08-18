import "dotenv/config";
import WebSocket from "ws";

const API_URL = "http://localhost:4000";
const WS_URL = "ws://localhost:4000/ws";

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookies = res.headers.getSetCookie();
  const accessTokenCookie = cookies.find((c) => c.startsWith("accessToken="));
  if (!accessTokenCookie) throw new Error("no accessToken cookie in login response");
  return accessTokenCookie.split(";")[0]!;
}

function testValidConnection(cookie: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Cookie: cookie } });
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("valid-token connection timed out, never opened"));
    }, 3000);
    ws.on("open", () => {
      clearTimeout(timeout);
      console.log("valid token: connection opened correctly");
      ws.close();
      resolve();
    });
    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(timeout);
      reject(new Error(`valid token: expected open, got HTTP ${res.statusCode}`));
    });
  });
}

function testInvalidConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Cookie: "accessToken=not-a-real-token" } });
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("invalid-token connection timed out instead of being rejected"));
    }, 3000);
    ws.on("open", () => {
      clearTimeout(timeout);
      ws.close();
      reject(new Error("invalid token: connection opened, should have been rejected with 401"));
    });
    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(timeout);
      if (res.statusCode === 401) {
        console.log("invalid token: correctly rejected with 401");
        resolve();
      } else {
        reject(new Error(`invalid token: expected 401, got ${res.statusCode}`));
      }
    });
  });
}

async function main() {
  const cookie = await login("shubham.mojidra20092002@gmail.com", "Hunter@2002");
  await testValidConnection(cookie);
  await testInvalidConnection();
  console.log("all checks passed");
}

main().catch((err) => {
  console.error("check failed:", err);
  process.exit(1);
});