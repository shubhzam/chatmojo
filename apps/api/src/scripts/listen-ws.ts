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

async function main() {
  const cookie = await login("harshada@example.com", "TestPass123!");
  const ws = new WebSocket(WS_URL, { headers: { Cookie: cookie } });

  ws.on("open", () => {
    console.log("connected, listening for pushes... (Ctrl+C to stop)");
  });

  ws.on("message", (data) => {
    console.log("received push:", data.toString());
  });

  ws.on("close", () => {
    console.log("connection closed");
  });
}

main().catch((err) => {
  console.error("listen failed:", err);
  process.exit(1);
});