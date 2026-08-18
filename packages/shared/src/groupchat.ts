import * as z from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  memberIds: z.array(z.uuid()).min(2),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const addMemberSchema = z.object({
  userId: z.uuid(),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const sendGroupMessageSchema = z.object({
  content: z.string().trim().min(1).max(4096),
});
export type SendGroupMessageInput = z.infer<typeof sendGroupMessageSchema>;