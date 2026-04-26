import type { IntentResult } from "./intentParser";

export interface DispatchPayload {
  sessionId: string;
  transcript: string;
  intent: IntentResult;
  metadata?: Record<string, unknown>;
}

export async function dispatchAction(payload: DispatchPayload) {
  if (payload.intent.intent === "NONE") return null;

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/action/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Action dispatch failed: ${response.status}`);
  }

  return response.json() as Promise<{ message: string; action: string }>;
}
