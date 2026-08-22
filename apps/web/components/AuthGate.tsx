"use client";

import { useGetMeQuery } from "../lib/store/api";
import { SocketProvider } from "../lib/ws/SocketProvider";
import { LoginScreen } from "./LoginScreen";
import { ChatShell } from "./ChatShell";

export function AuthGate() {
  const { data: me, isLoading, isUninitialized } = useGetMeQuery();

  if (isLoading || isUninitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wa-bg">
        <p className="text-sm text-wa-muted">Loading...</p>
      </div>
    );
  }

  if (!me) {
    return <LoginScreen />;
  }

  return (
    <SocketProvider enabled>
      <ChatShell me={me} />
    </SocketProvider>
  );
}
