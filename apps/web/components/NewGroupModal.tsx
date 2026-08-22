"use client";

import { useEffect, useState } from "react";
import { useCreateGroupMutation, useLazySearchUsersQuery, type UserSummary } from "../lib/store/api";
import { Avatar } from "./Avatar";

export function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (groupId: string, name: string, memberCount: number) => void;
}) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [trigger, { data, isFetching }] = useLazySearchUsersQuery();
  const [createGroup, { isLoading, error }] = useCreateGroupMutation();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q.trim()) trigger(q.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [q, trigger]);

  function toggle(user: UserSummary) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  }

  async function handleCreate() {
    if (!name.trim() || selected.length < 2) return;
    const result = await createGroup({ name: name.trim(), memberIds: selected.map((u) => u.id) }).unwrap();
    onCreated(result.id, result.name, result.memberIds.length);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/40 pt-20" onClick={onClose}>
      <div
        className="flex max-h-[75vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-wa-border p-4">
          <h2 className="mb-3 text-base font-semibold">New group</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="mb-2 w-full rounded-md border border-wa-border px-3 py-2 text-sm outline-none focus:border-wa-green"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Add members (need at least 2)"
            className="w-full rounded-md border border-wa-border px-3 py-2 text-sm outline-none focus:border-wa-green"
          />
          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 rounded-full bg-wa-header px-2 py-1 text-xs"
                >
                  {u.displayName}
                  <button onClick={() => toggle(u)} className="text-wa-muted hover:text-wa-text">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isFetching && <p className="p-4 text-sm text-wa-muted">Searching...</p>}
          {data?.map((user) => {
            const isSelected = selected.some((u) => u.id === user.id);
            return (
              <button
                key={user.id}
                onClick={() => toggle(user)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-wa-header"
              >
                <Avatar name={user.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.displayName}</p>
                  <p className="truncate text-xs text-wa-muted">{user.email}</p>
                </div>
                {isSelected && <span className="text-wa-green">✓</span>}
              </button>
            );
          })}
        </div>
        {error && <p className="px-4 pt-2 text-sm text-red-600">Could not create group.</p>}
        <div className="flex items-center justify-between border-t border-wa-border p-3">
          <span className="text-xs text-wa-muted">{selected.length} selected (min 2)</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-wa-muted hover:bg-wa-header">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || selected.length < 2 || isLoading}
              className="rounded-md bg-wa-green px-3 py-1.5 text-sm font-medium text-white hover:bg-wa-green-dark disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
