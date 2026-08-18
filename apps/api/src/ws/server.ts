import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { parseCookie } from "cookie";
import { verifyAccessToken } from "../lib/jwt.js";
import { addConnection, removeConnection } from "../lib/wsRegistry.js";

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    if (request.url !== "/ws") {
      socket.destroy();
      return;
    }

    const cookies = parseCookie(request.headers.cookie ?? "");
    const token = cookies.accessToken;

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let userId: string;
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.sub as string;
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      addConnection(userId, ws);
      ws.on("close", () => removeConnection(userId, ws));
    });
  });
}