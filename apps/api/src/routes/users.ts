import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/users/search", requireAuth, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.id },
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, displayName: true },
    take: 20,
  });

  res.json(users);
});
