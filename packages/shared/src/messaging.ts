import * as z from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.uuid(),
  content: z.string().trim().min(1).max(4096),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listMessagesQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;