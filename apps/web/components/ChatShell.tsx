"use client";

import { useState } from "react";
import type { MeResponse } from "../lib/store/api";
import type { SelectedChat } from "../lib/types";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";

export function ChatShell({ me }: { me: MeResponse }) {
  const [selected, setSelected] = useState<SelectedChat | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar me={me} selected={selected} onSelect={setSelected} />
      {selected ? (
        <ChatWindow
          key={selected.kind === "dm" ? `dm-${selected.otherUser.id}` : `group-${selected.groupId}`}
          me={me}
          chat={selected}
          onConversationResolved={(conversationId) =>
            setSelected((prev) => (prev && prev.kind === "dm" ? { ...prev, conversationId } : prev))
          }
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-wa-header text-wa-muted">
          <div className="text-5xl">💬</div>
          <p className="text-lg font-medium text-wa-text">WebChat</p>
          <p className="text-sm">Select a chat or start a new one to begin messaging.</p>
        </div>
      )}
    </div>
  );
}
