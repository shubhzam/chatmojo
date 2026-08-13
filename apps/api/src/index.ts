import "dotenv/config";
import express from "express";
import { prisma } from "./lib/db.js";
import { redis } from "./lib/redis.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

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

async function start() {
  try {
    await redis.connect();
  } catch (err) {
    console.error("initial redis connect failed, /health will report it as down:", err);
  }

  app.listen(PORT, () => {
    console.log(`api listening on port ${PORT}`);
  });
}

start();