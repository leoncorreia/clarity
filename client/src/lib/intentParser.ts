export type IntentType =
  | "EMERGENCY_DISPATCH"
  | "SAFE_WORD"
  | "INGESTION_DISCLOSURE"
  | "THERAPIST_REQUEST"
  | "NONE";

export interface IntentResult {
  intent: IntentType;
  substance?: string;
}

const emergencyTerms = ["i need help", "call 911", "i can't do this", "i want to hurt myself", "i took something"];
const safeTerms = ["i'm safe", "i feel better", "thank you i'm okay"];
const ingestionTerms = ["i took", "i drank", "i swallowed", "overdose", "pills", "medication"];
const therapistTerms = ["talk to someone", "real person", "therapist", "counselor"];

export function parseIntent(transcript: string, distressSustained: boolean): IntentResult {
  const text = transcript.toLowerCase();

  if (distressSustained || emergencyTerms.some((term) => text.includes(term))) {
    return { intent: "EMERGENCY_DISPATCH" };
  }

  if (safeTerms.some((term) => text.includes(term))) {
    return { intent: "SAFE_WORD" };
  }

  if (ingestionTerms.some((term) => text.includes(term))) {
    const match = text.match(/(took|drank|swallowed)\s+([a-z0-9\s-]+)/i);
    return { intent: "INGESTION_DISCLOSURE", substance: match?.[2]?.trim() };
  }

  if (therapistTerms.some((term) => text.includes(term))) {
    return { intent: "THERAPIST_REQUEST" };
  }

  return { intent: "NONE" };
}
