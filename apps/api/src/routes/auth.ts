import crypto from "node:crypto";
import { Router } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/db.js";
import { redis } from "../lib/redis.js";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies.js";
import { signAccessToken } from "../lib/jwt.js";
import { RateLimiterRes } from "rate-limiter-flexible";
import { loginRateLimiter } from "../lib/rateLimiter.js";
import { registerSchema, loginSchema } from "@repo/shared/auth";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const DUMMY_HASH = await argon2.hash("dummy-password-for-constant-time-login", {
  type: argon2.argon2id,
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }

  const { email, password, displayName } = parsed.data;

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });
    res.status(201).json({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return res.status(409).json({ error: "email already registered" });
    }
    console.error("register failed:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const rateLimitKey = `${req.ip}:${email}`;

  try {
    await loginRateLimiter.consume(rateLimitKey);
  } catch (rateLimitRes) {
    if (rateLimitRes instanceof RateLimiterRes) {
      const secs = Math.round(rateLimitRes.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(secs));
      return res.status(429).json({ error: "too many attempts" });
    }
    console.error("rate limiter error:", rateLimitRes);
    return res.status(500).json({ error: "internal server error" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const validPassword = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !validPassword) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const accessToken = await signAccessToken(user.id, user.email);
  const refreshTokenId = crypto.randomBytes(32).toString("base64url");

  await redis.set(
    `refresh:${refreshTokenId}`,
    JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() }),
    { EX: 60 * 60 * 24 * 30 }
  );

  setAuthCookies(res, accessToken, refreshTokenId);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });

});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "missing refresh token" });
  }

  const raw = await redis.getDel(`refresh:${refreshToken}`);
  if (!raw) {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  const { userId, createdAt } = JSON.parse(raw) as { userId: string; createdAt: string };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  const accessToken = await signAccessToken(user.id, user.email);
  const newRefreshTokenId = crypto.randomBytes(32).toString("base64url");

  await redis.set(
    `refresh:${newRefreshTokenId}`,
    JSON.stringify({ userId: user.id, createdAt }),
    { EX: 60 * 60 * 24 * 30 }
  );

  setAuthCookies(res, accessToken, newRefreshTokenId);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});

authRouter.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await redis.del(`refresh:${refreshToken}`);
  }
  clearAuthCookies(res);
  res.status(200).json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});