"use client";

import { useEffect, useState } from "react";
import { useLazySearchUsersQuery, type DMConversation, type UserSummary } from "../lib/store/api";
import { Avatar } from "./Avatar";

export function NewChatModal({
  conversations,
  onClose,
  onSelect,
}: {
  conversations: DMConversation[];
  onClose: () => void;
  onSelect: (user: UserSummary, existingConversationId: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [trigger, { data, isFetching }] = useLazySearchUsersQuery();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q.trim()) trigger(q.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [q, trigger]);

  function pick(user: UserSummary) {
    const existing = conversations.find((c) => c.otherUser.id === user.id);
    onSelect(user, existing?.id ?? null);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/40 pt-24" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-wa-border p-4">
          <h2 className="mb-3 text-base font-semibold">New chat</h2>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-md border border-wa-border px-3 py-2 text-sm outline-none focus:border-wa-green"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isFetching && <p className="p-4 text-sm text-wa-muted">Searching...</p>}
          {!isFetching && q.trim() && data?.length === 0 && (
            <p className="p-4 text-sm text-wa-muted">No users found.</p>
          )}
          {data?.map((user) => (
            <button
              key={user.id}
              onClick={() => pick(user)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-wa-header"
            >
              <Avatar name={user.displayName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.displayName}</p>
                <p className="truncate text-xs text-wa-muted">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-wa-border p-3 text-right">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-wa-muted hover:bg-wa-header">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
