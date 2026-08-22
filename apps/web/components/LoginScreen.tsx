"use client";

import { useState, type FormEvent } from "react";
import { useLoginMutation, useRegisterMutation } from "../lib/store/api";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [login, { isLoading: loggingIn, error: loginError }] = useLoginMutation();
  const [register, { isLoading: registering, error: registerError }] = useRegisterMutation();

  const isLoading = loggingIn || registering;
  const error = mode === "login" ? loginError : registerError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      await login({ email, password });
    } else {
      await register({ email, password, displayName });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-wa-bg px-4">
      <div className="w-full max-w-sm rounded-lg bg-wa-panel p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-wa-green text-2xl text-white">
            💬
          </div>
          <h1 className="text-xl font-semibold text-wa-text">WebChat</h1>
          <p className="text-sm text-wa-muted">{mode === "login" ? "Log in to continue" : "Create your account"}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="rounded-md border border-wa-border bg-white px-3 py-2 text-sm outline-none focus:border-wa-green"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-wa-border bg-white px-3 py-2 text-sm outline-none focus:border-wa-green"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            minLength={mode === "register" ? 8 : undefined}
            className="rounded-md border border-wa-border bg-white px-3 py-2 text-sm outline-none focus:border-wa-green"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-md bg-wa-green px-3 py-2 text-sm font-medium text-white transition hover:bg-wa-green-dark disabled:opacity-60"
          >
            {isLoading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center text-sm text-red-600">
            {mode === "login" ? "Invalid email or password." : "Could not create account. Try a different email."}
          </p>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-5 w-full text-center text-sm text-wa-green hover:underline"
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
