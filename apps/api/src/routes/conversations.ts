import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendMessageSchema, listMessagesQuerySchema } from "@repo/shared/messaging";
export const conversationsRouter = Router();

async function findOrCreateConversation(userId1: string, userId2: string) {
  const userAId = userId1 < userId2 ? userId1 : userId2;
  const userBId = userId1 < userId2 ? userId2 : userId1;

  const existing = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existing) return existing;

  try {
    return await prisma.conversation.create({
      data: { userAId, userBId },
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const conversation = await prisma.conversation.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
      });
      if (conversation) return conversation;
    }
    throw err;
  }
}

conversationsRouter.post("/messages", requireAuth, async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }

  const { recipientId, content } = parsed.data;
  const senderId = req.user!.id;

  if (recipientId === senderId) {
    return res.status(400).json({ error: "cannot message yourself" });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return res.status(404).json({ error: "recipient not found" });
  }

  const conversation = await findOrCreateConversation(senderId, recipientId);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId: conversation.id, senderId, content },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    return created;
  });

  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
  });
});

conversationsRouter.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, email: true, displayName: true } },
      userB: { select: { id: true, email: true, displayName: true } },
    },
  });

  const result = conversations.map((c) => {
    const otherUser = c.userAId === userId ? c.userB : c.userA;
    return {
      id: c.id,
      otherUser: { id: otherUser.id, email: otherUser.email, displayName: otherUser.displayName },
      lastMessageAt: c.lastMessageAt,
    };
  });

  res.json(result);
});

conversationsRouter.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const conversationId = req.params.id as string;

  const parsedQuery = listMessagesQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: "invalid query", details: parsedQuery.error.issues });
  }
  const { cursor, limit } = parsedQuery.data;

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== userId && conversation.userBId !== userId)) {
    return res.status(404).json({ error: "conversation not found" });
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
  });

  const nextCursor = messages.length === limit ? (messages[messages.length - 1]?.id ?? null) : null;

  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
    })),
    nextCursor,
  });
});