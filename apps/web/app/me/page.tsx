"use client";

import { useGetMeQuery } from "../../lib/store/api";

export default function MePage() {
  const { data, error, isLoading } = useGetMeQuery();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Not logged in</p>;

  return (
    <main style={{ padding: 32 }}>
      <h1>Session</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}