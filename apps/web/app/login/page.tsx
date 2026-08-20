"use client";

import { useState, type FormEvent } from "react";
import { useLoginMutation } from "../../lib/store/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login({ email, password });
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>Login failed</p>}
    </main>
  );
}