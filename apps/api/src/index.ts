import "dotenv/config";
import http from "node:http";
import express from "express";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { authRouter } from "./routes/auth.js";
import { conversationsRouter } from "./routes/conversations.js";
import { groupsRouter } from "./routes/groups.js";
import cookieParser from "cookie-parser";
import { attachWebSocketServer } from "./ws/server.js";


const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(express.json());
app.use(cookieParser());
app.use(conversationsRouter);
app.use(groupsRouter);

app.get("/", (_req, res) => {
  res.json({ service: "api", status: "ok" });
});

app.get("/health", async (_req, res) => {
  const checks = { db: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err) {
    console.error("health check: db unreachable", err);
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch (err) {
    console.error("health check: redis unreachable", err);
  }

  const healthy = checks.db && checks.redis;
  res.status(healthy ? 200 : 503).json(checks);
});

app.use("/auth", authRouter);

async function start() {
  try {
    await redis.connect();
  } catch (err) {
    console.error("initial redis connect failed, /health will report it as down:", err);
  }

  const server = http.createServer(app);
  attachWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(`api listening on port ${PORT}`);
  });
}

start();