import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const payload = await verifyAccessToken(token);
    req.user = { id: payload.sub as string, email: payload.email as string };
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}