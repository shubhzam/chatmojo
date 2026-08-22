import type { UserSummary } from "./store/api";

export type SelectedChat =
  | { kind: "dm"; conversationId: string | null; otherUser: UserSummary }
  | { kind: "group"; groupId: string; name: string; memberCount: number };
