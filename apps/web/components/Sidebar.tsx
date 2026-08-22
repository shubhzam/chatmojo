"use client";

import { useMemo, useState } from "react";
import {
  useGetConversationsQuery,
  useGetGroupsQuery,
  useLogoutMutation,
  type DMConversation,
  type GroupSummary,
  type MeResponse,
  type UserSummary,
} from "../lib/store/api";
import type { SelectedChat } from "../lib/types";
import { Avatar } from "./Avatar";
import { NewChatModal } from "./NewChatModal";
import { NewGroupModal } from "./NewGroupModal";
import { timeLabel } from "../lib/format";

type ListItem =
  | { kind: "dm"; id: string; name: string; subtitle: string; lastMessageAt: string; conversation: DMConversation }
  | { kind: "group"; id: string; name: string; subtitle: string; lastMessageAt: string; group: GroupSummary };

export function Sidebar({
  me,
  selected,
  onSelect,
}: {
  me: MeResponse;
  selected: SelectedChat | null;
  onSelect: (chat: SelectedChat) => void;
}) {
  const { data: conversations = [] } = useGetConversationsQuery();
  const { data: groups = [] } = useGetGroupsQuery();
  const [logout] = useLogoutMutation();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const items: ListItem[] = useMemo(() => {
    const dmItems: ListItem[] = conversations.map((c) => ({
      kind: "dm",
      id: c.id,
      name: c.otherUser.displayName,
      subtitle: c.otherUser.email,
      lastMessageAt: c.lastMessageAt,
      conversation: c,
    }));
    const groupItems: ListItem[] = groups.map((g) => ({
      kind: "group",
      id: g.id,
      name: g.name,
      subtitle: `${g.memberCount} members`,
      lastMessageAt: g.lastMessageAt,
      group: g,
    }));
    return [...dmItems, ...groupItems].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [conversations, groups]);

  function isActive(item: ListItem) {
    if (!selected) return false;
    if (item.kind === "dm") return selected.kind === "dm" && selected.otherUser.id === item.conversation.otherUser.id;
    return selected.kind === "group" && selected.groupId === item.id;
  }

  function selectUser(user: UserSummary, existingConversationId: string | null) {
    setShowNewChat(false);
    onSelect({ kind: "dm", conversationId: existingConversationId, otherUser: user });
  }

  function groupCreated(groupId: string, name: string, memberCount: number) {
    setShowNewGroup(false);
    onSelect({ kind: "group", groupId, name, memberCount });
  }

  return (
    <div className="flex h-full w-full max-w-sm flex-col border-r border-wa-border bg-wa-sidebar">
      <div className="flex items-center justify-between bg-wa-header px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={me.displayName} size={36} />
          <span className="text-sm font-medium">{me.displayName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New group"
            onClick={() => setShowNewGroup(true)}
            className="rounded-full p-2 text-lg hover:bg-black/5"
          >
            👥
          </button>
          <button
            title="New chat"
            onClick={() => setShowNewChat(true)}
            className="rounded-full p-2 text-lg hover:bg-black/5"
          >
            ✏️
          </button>
          <button
            title="Log out"
            onClick={() => logout()}
            className="rounded-full p-2 text-lg hover:bg-black/5"
          >
            ⏻
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-wa-muted">
            No chats yet. Start one with the pencil icon above.
          </p>
        )}
        {items.map((item) => (
          <button
            key={`${item.kind}-${item.id}`}
            onClick={() =>
              item.kind === "dm"
                ? onSelect({ kind: "dm", conversationId: item.conversation.id, otherUser: item.conversation.otherUser })
                : onSelect({ kind: "group", groupId: item.group.id, name: item.group.name, memberCount: item.group.memberCount })
            }
            className={`flex w-full items-center gap-3 border-b border-wa-border/60 px-4 py-3 text-left hover:bg-wa-header ${
              isActive(item) ? "bg-wa-header" : ""
            }`}
          >
            <Avatar name={item.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <span className="shrink-0 text-xs text-wa-muted">{timeLabel(item.lastMessageAt)}</span>
              </div>
              <p className="truncate text-xs text-wa-muted">
                {item.kind === "group" ? `👥 ${item.subtitle}` : item.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {showNewChat && (
        <NewChatModal
          conversations={conversations}
          onClose={() => setShowNewChat(false)}
          onSelect={selectUser}
        />
      )}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={groupCreated} />}
    </div>
  );
}
