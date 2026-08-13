import "dotenv/config";
import { redis } from "../lib/redis.js";

async function main() {
  await redis.connect();
  await redis.set("scaffold:check", "ok");
  const value = await redis.get("scaffold:check");
  console.log("redis connection ok:", value);
  redis.destroy();
}

main().catch((err) => {
  console.error("redis connection failed:", err);
  process.exit(1);
});