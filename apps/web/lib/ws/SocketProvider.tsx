"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useDispatch } from "react-redux";
import { api } from "../store/api";
import type { AppDispatch } from "../store/store";

type IncomingEvent =
  | { type: "message"; data: { id: string; conversationId: string; senderId: string; content: string; createdAt: string } }
  | { type: "group_message"; data: { id: string; groupConversationId: string; senderId: string; content: string; createdAt: string } };

const SocketContext = createContext<{ connected: boolean }>({ connected: false });

export function useSocketStatus() {
  return useContext(SocketContext);
}

function wsUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return apiUrl.replace(/^http/, "ws") + "/ws";
}

export function SocketProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl());
      socketRef.current = ws;

      ws.onmessage = (event) => {
        let parsed: IncomingEvent;
        try {
          parsed = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (parsed.type === "message") {
          dispatch(
            api.util.invalidateTags([{ type: "DMMessages", id: parsed.data.conversationId }, "Conversations"])
          );
        } else if (parsed.type === "group_message") {
          dispatch(
            api.util.invalidateTags([{ type: "GroupMessages", id: parsed.data.groupConversationId }, "Groups"])
          );
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        retryTimer = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, dispatch]);

  return <SocketContext.Provider value={{ connected: enabled }}>{children}</SocketContext.Provider>;
}
