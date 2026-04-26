export async function startSession() {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) throw new Error("Failed to start session");
  return response.json() as Promise<{ sessionId: string; startedAt: string }>;
}

export async function endSession(sessionId: string, summaryText: string) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/session/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, summaryText })
  });

  if (!response.ok) throw new Error("Failed to end session");
  return response.json();
}

export async function logAffectBatch(
  sessionId: string,
  batch: Array<{ timestamp: string; dominantEmotion: string; scores: Record<string, number> }>
) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/webhook/hume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, batch })
  });

  if (!response.ok) throw new Error("Failed to persist affect batch");
}
