import "dotenv/config";
import { signAccessToken, verifyAccessToken } from "../lib/jwt.js";

async function main() {
  const token = await signAccessToken("test-user-id", "test@example.com");
  console.log("signed:", token);

  const payload = await verifyAccessToken(token);
  console.log("verified payload:", payload);

  try {
    await verifyAccessToken("not.a.real.token");
    console.error("FAIL: garbage token was accepted");
    process.exit(1);
  } catch {
    console.log("correctly rejected garbage token");
  }

  try {
    await verifyAccessToken(token + "tampered");
    console.error("FAIL: tampered token was accepted");
    process.exit(1);
  } catch {
    console.log("correctly rejected tampered token");
  }
}

main().catch((err) => {
  console.error("jwt check failed:", err);
  process.exit(1);
});