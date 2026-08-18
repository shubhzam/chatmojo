import type { WebSocket } from "ws";

const registry = new Map<string, Set<WebSocket>>();

export function addConnection(userId: string, ws: WebSocket) {
  let sockets = registry.get(userId);
  if (!sockets) {
    sockets = new Set();
    registry.set(userId, sockets);
  }
  sockets.add(ws);
  console.log(`ws: added connection for ${userId}, now ${sockets.size} connection(s), ${registry.size} user(s) total`);
}

export function removeConnection(userId: string, ws: WebSocket) {
  const sockets = registry.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    registry.delete(userId);
    console.log(`ws: removed last connection for ${userId}, entry deleted, ${registry.size} user(s) total`);
  } else {
    console.log(`ws: removed connection for ${userId}, ${sockets.size} remaining, ${registry.size} user(s) total`);
  }
}

export function pushToUser(userId: string, payload: unknown) {
  const sockets = registry.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}