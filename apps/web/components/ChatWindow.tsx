"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  useGetConversationMessagesQuery,
  useGetGroupMembersQuery,
  useGetGroupMessagesQuery,
  useLazyGetConversationMessagesQuery,
  useLazyGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useSendMessageMutation,
  type DMMessage,
  type GroupMessage,
  type MeResponse,
} from "../lib/store/api";
import type { SelectedChat } from "../lib/types";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";

export function ChatWindow({
  me,
  chat,
  onConversationResolved,
}: {
  me: MeResponse;
  chat: SelectedChat;
  onConversationResolved: (conversationId: string) => void;
}) {
  if (chat.kind === "dm") {
    return <DMWindow me={me} chat={chat} onConversationResolved={onConversationResolved} />;
  }
  return <GroupWindow me={me} chat={chat} />;
}

function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dep]);
  return ref;
}

function ChatHeader({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-wa-border bg-wa-header px-4 py-2.5">
      <Avatar name={name} size={40} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-wa-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-wa-border bg-wa-header px-4 py-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message"
        className="flex-1 rounded-full border-none bg-white px-4 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-wa-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}

function DMWindow({
  me,
  chat,
  onConversationResolved,
}: {
  me: MeResponse;
  chat: Extract<SelectedChat, { kind: "dm" }>;
  onConversationResolved: (conversationId: string) => void;
}) {
  const conversationId = chat.conversationId;
  const { data } = useGetConversationMessagesQuery(
    { conversationId: conversationId ?? "" },
    { skip: !conversationId }
  );
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyGetConversationMessagesQuery();
  const [olderMessages, setOlderMessages] = useState<DMMessage[]>([]);
  const [manualCursor, setManualCursor] = useState<string | null>(null);
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();

  useEffect(() => {
    setOlderMessages([]);
    setManualCursor(null);
  }, [conversationId]);

  const olderCursor = olderMessages.length > 0 ? manualCursor : (data?.nextCursor ?? null);
  const headMessages = useMemo(() => [...(data?.messages ?? [])].reverse(), [data]);
  const allMessages = useMemo(() => [...olderMessages, ...headMessages], [olderMessages, headMessages]);
  const bottomRef = useAutoScroll(headMessages.length ? headMessages[headMessages.length - 1]?.id : conversationId);

  async function loadOlder() {
    if (!conversationId || !olderCursor) return;
    const result = await fetchOlder({ conversationId, cursor: olderCursor }).unwrap();
    setOlderMessages((prev) => [...[...result.messages].reverse(), ...prev]);
    setManualCursor(result.nextCursor);
  }

  async function handleSend(text: string) {
    const result = await sendMessage({ recipientId: chat.otherUser.id, content: text }).unwrap();
    if (!conversationId) onConversationResolved(result.conversationId);
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <ChatHeader name={chat.otherUser.displayName} subtitle={chat.otherUser.email} />
      <div className="flex-1 overflow-y-auto bg-wa-bg px-6 py-4">
        {olderCursor && (
          <div className="mb-3 text-center">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full bg-white px-3 py-1 text-xs text-wa-muted shadow-sm hover:bg-wa-header"
            >
              {loadingOlder ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}
        {allMessages.length === 0 && (
          <p className="mt-10 text-center text-sm text-wa-muted">
            Say hi to {chat.otherUser.displayName} 👋
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {allMessages.map((m) => (
            <MessageBubble key={m.id} content={m.content} createdAt={m.createdAt} isOwn={m.senderId === me.id} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
      <Composer onSend={handleSend} disabled={sending} />
    </div>
  );
}

function GroupWindow({ me, chat }: { me: MeResponse; chat: Extract<SelectedChat, { kind: "group" }> }) {
  const { data } = useGetGroupMessagesQuery({ groupId: chat.groupId });
  const { data: members = [] } = useGetGroupMembersQuery(chat.groupId);
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyGetGroupMessagesQuery();
  const [olderMessages, setOlderMessages] = useState<GroupMessage[]>([]);
  const [manualCursor, setManualCursor] = useState<string | null>(null);
  const [sendMessage, { isLoading: sending }] = useSendGroupMessageMutation();

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.userId, m.displayName]));
    return (userId: string) => (userId === me.id ? "You" : map.get(userId) ?? "Unknown");
  }, [members, me.id]);

  useEffect(() => {
    setOlderMessages([]);
    setManualCursor(null);
  }, [chat.groupId]);

  const olderCursor = olderMessages.length > 0 ? manualCursor : (data?.nextCursor ?? null);
  const headMessages = useMemo(() => [...(data?.messages ?? [])].reverse(), [data]);
  const allMessages = useMemo(() => [...olderMessages, ...headMessages], [olderMessages, headMessages]);
  const bottomRef = useAutoScroll(headMessages.length ? headMessages[headMessages.length - 1]?.id : chat.groupId);

  async function loadOlder() {
    if (!olderCursor) return;
    const result = await fetchOlder({ groupId: chat.groupId, cursor: olderCursor }).unwrap();
    setOlderMessages((prev) => [...[...result.messages].reverse(), ...prev]);
    setManualCursor(result.nextCursor);
  }

  async function handleSend(text: string) {
    await sendMessage({ groupId: chat.groupId, content: text }).unwrap();
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <ChatHeader name={chat.name} subtitle={`${chat.memberCount} members`} />
      <div className="flex-1 overflow-y-auto bg-wa-bg px-6 py-4">
        {olderCursor && (
          <div className="mb-3 text-center">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full bg-white px-3 py-1 text-xs text-wa-muted shadow-sm hover:bg-wa-header"
            >
              {loadingOlder ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}
        {allMessages.length === 0 && (
          <p className="mt-10 text-center text-sm text-wa-muted">No messages yet. Start the conversation 👋</p>
        )}
        <div className="flex flex-col gap-1.5">
          {allMessages.map((m) => (
            <MessageBubble
              key={m.id}
              content={m.content}
              createdAt={m.createdAt}
              isOwn={m.senderId === me.id}
              senderLabel={m.senderId === me.id ? undefined : memberName(m.senderId)}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
      <Composer onSend={handleSend} disabled={sending} />
    </div>
  );
}
