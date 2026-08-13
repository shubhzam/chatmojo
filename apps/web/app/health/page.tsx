async function getHealth() {
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: "api unreachable" } };
  }
}

export default async function HealthPage() {
  const health = await getHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">System health</h1>
      <p className={health.ok ? "text-green-600" : "text-red-600"}>
        API status: {health.ok ? "healthy" : "unhealthy"} ({health.status || "no response"})
      </p>
      <pre className="rounded bg-gray-100 p-4 text-sm">
        {JSON.stringify(health.body, null, 2)}
      </pre>
    </main>
  );
}