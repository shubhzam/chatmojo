import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { createGroupSchema, addMemberSchema, sendGroupMessageSchema } from "@repo/shared/groupchat";
import { listMessagesQuerySchema } from "@repo/shared/messaging";
import { pushToUser } from "../lib/wsRegistry.js";

export const groupsRouter = Router();

groupsRouter.post("/groups", requireAuth, async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }

  const { name, memberIds } = parsed.data;
  const creatorId = req.user!.id;

  if (memberIds.includes(creatorId)) {
    return res.status(400).json({ error: "creator should not be included in memberIds" });
  }

  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length < 2) {
    return res.status(400).json({ error: "at least 2 distinct members are required besides the creator" });
  }

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: uniqueMemberIds } },
    select: { id: true },
  });
  if (existingUsers.length !== uniqueMemberIds.length) {
    return res.status(400).json({ error: "one or more memberIds do not exist" });
  }

  const allMemberIds = [creatorId, ...uniqueMemberIds];

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.groupConversation.create({
      data: { name, createdBy: creatorId },
    });
    await tx.groupMembership.createMany({
      data: allMemberIds.map((userId) => ({ userId, groupConversationId: created.id })),
    });
    return created;
  });

  res.status(201).json({
    id: group.id,
    name: group.name,
    createdBy: group.createdBy,
    memberIds: allMemberIds,
    createdAt: group.createdAt,
  });
});

groupsRouter.post("/groups/:groupId/members", requireAuth, async (req, res) => {
  const requesterId = req.user!.id;
  const groupId = req.params.groupId as string;

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }
  const { userId } = parsed.data;

  const requesterMembership = await prisma.groupMembership.findUnique({
    where: { userId_groupConversationId: { userId: requesterId, groupConversationId: groupId } },
  });
  if (!requesterMembership) {
    return res.status(404).json({ error: "group not found" });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return res.status(400).json({ error: "user not found" });
  }

  try {
    const membership = await prisma.groupMembership.create({
      data: { userId, groupConversationId: groupId },
    });
    return res.status(201).json({
      groupId: membership.groupConversationId,
      userId: membership.userId,
      joinedAt: membership.joinedAt,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const existing = await prisma.groupMembership.findUnique({
        where: { userId_groupConversationId: { userId, groupConversationId: groupId } },
      });
      if (existing) {
        return res.status(200).json({
          groupId: existing.groupConversationId,
          userId: existing.userId,
          joinedAt: existing.joinedAt,
        });
      }
    }
    throw err;
  }
});

groupsRouter.post("/groups/:groupId/leave", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const groupId = req.params.groupId as string;

  await prisma.groupMembership.deleteMany({
    where: { userId, groupConversationId: groupId },
  });

  res.status(200).json({ ok: true });
});

groupsRouter.post("/groups/:groupId/messages", requireAuth, async (req, res) => {
  const senderId = req.user!.id;
  const groupId = req.params.groupId as string;

  const parsed = sendGroupMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid input", details: parsed.error.issues });
  }
  const { content } = parsed.data;

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupConversationId: { userId: senderId, groupConversationId: groupId } },
  });
  if (!membership) {
    return res.status(404).json({ error: "group not found" });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.groupMessage.create({
      data: { groupConversationId: groupId, senderId, content },
    });
    await tx.groupConversation.update({
      where: { id: groupId },
      data: { lastMessageAt: new Date() },
    });
    return created;
  });

  const otherMembers = await prisma.groupMembership.findMany({
    where: { groupConversationId: groupId, userId: { not: senderId } },
    select: { userId: true },
  });
  for (const member of otherMembers) {
    pushToUser(member.userId, {
      type: "group_message",
      data: {
        id: message.id,
        groupConversationId: message.groupConversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  }

  res.status(201).json({
    id: message.id,
    groupConversationId: message.groupConversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
  });
});

groupsRouter.get("/groups", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    include: {
      group: {
        include: { _count: { select: { memberships: true } } },
      },
    },
    orderBy: { group: { lastMessageAt: "desc" } },
  });

  const result = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    createdBy: m.group.createdBy,
    lastMessageAt: m.group.lastMessageAt,
    memberCount: m.group._count.memberships,
  }));

  res.json(result);
});

groupsRouter.get("/groups/:groupId/messages", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const groupId = req.params.groupId as string;

  const parsedQuery = listMessagesQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: "invalid query", details: parsedQuery.error.issues });
  }
  const { cursor, limit } = parsedQuery.data;

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupConversationId: { userId, groupConversationId: groupId } },
  });
  if (!membership) {
    return res.status(404).json({ error: "group not found" });
  }

  const messages = await prisma.groupMessage.findMany({
    where: {
      groupConversationId: groupId,
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

groupsRouter.get("/groups/:groupId/members", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const groupId = req.params.groupId as string;

  const requesterMembership = await prisma.groupMembership.findUnique({
    where: { userId_groupConversationId: { userId, groupConversationId: groupId } },
  });
  if (!requesterMembership) {
    return res.status(404).json({ error: "group not found" });
  }``

  const memberships = await prisma.groupMembership.findMany({
    where: { groupConversationId: groupId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  const result = memberships.map((m) => ({
    userId: m.user.id,
    email: m.user.email,
    displayName: m.user.displayName,
    joinedAt: m.joinedAt,
  }));

  res.json(result);
});