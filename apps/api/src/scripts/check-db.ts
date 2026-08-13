import "dotenv/config";
import { prisma } from "../lib/db.js";

async function main() {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("db connection ok:", result);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("db connection failed:", err);
  process.exit(1);
});