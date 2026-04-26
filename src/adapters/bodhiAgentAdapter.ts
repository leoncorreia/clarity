import type { AdapterGuidance } from "../state/clarityStateMachine";

interface BodhiDecision {
  priority: "critical" | "high" | "medium" | "low";
  action: string;
  response: string;
  confidence: number;
}

type BodhiSource = "mock" | "live";

export interface BodhiDecisionInput {
  userInput: string;
  sceneContext: string;
  urgencyLevel: number;
}

const useRealBodhi = (import.meta.env.VITE_USE_REAL_BODHI as string | undefined) === "true";
const bodhiAgentId = import.meta.env.VITE_BODHI_AGENT_ID as string | undefined;
const bodhiApiKey = import.meta.env.VITE_BODHI_API_KEY as string | undefined;
const bodhiBaseUrl = import.meta.env.VITE_BODHI_BASE_URL as string | undefined;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || undefined;

let lastSource: BodhiSource = "mock";

const isValidPriority = (
  value: string | undefined
): value is BodhiDecision["priority"] =>
  value === "critical" ||
  value === "high" ||
  value === "medium" ||
  value === "low";

const isValidDecision = (value: unknown): value is BodhiDecision => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<BodhiDecision>;
  return (
    isValidPriority(candidate.priority) &&
    typeof candidate.action === "string" &&
    typeof candidate.response === "string" &&
    typeof candidate.confidence === "number" &&
    Number.isFinite(candidate.confidence)
  );
};

const normalizeConfidence = (confidence: number): number =>
  Math.max(0, Math.min(1, confidence));

const mockGuidanceForUrgency = (urgencyLevel: number): AdapterGuidance => {
  if (urgencyLevel >= 4) {
    return {
      text: "Airway first. Pressure on bleed now. Prepare assisted breathing.",
      confidence: 0.97
    };
  }

  return {
    text: "Open airway, check pulse, then control bleeding with direct pressure.",
    confidence: 0.95
  };
};

const mockInterruptionGuidance = (): AdapterGuidance => ({
  text: "Understood. Control the bleeding now. Apply direct pressure while maintaining airway awareness.",
  confidence: 0.98
});

const mockVisualEventGuidance = (): AdapterGuidance => ({
  text: "The left monitor shows oxygen dropping. Recheck airway and prepare assisted breathing.",
  confidence: 0.96
});

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    window.setTimeout(() => reject(new Error("Bodhi timeout")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

const requestBodhiDecision = async (
  input: BodhiDecisionInput
): Promise<BodhiDecision | null> => {
  if (!useRealBodhi) {
    return null;
  }

  const isProxyMode = Boolean(apiBaseUrl);
  if (!isProxyMode && (!bodhiBaseUrl || !bodhiApiKey)) {
    return null;
  }

  const endpoint = isProxyMode
    ? `${apiBaseUrl!.replace(/\/$/, "")}/decision`
    : `${bodhiBaseUrl!.replace(/\/$/, "")}/decision`;

  const request = fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isProxyMode ? {} : { Authorization: `Bearer ${bodhiApiKey}` })
    },
    body: JSON.stringify({
      agent_id: bodhiAgentId ?? "",
      user_input: input.userInput,
      scene_context: input.sceneContext,
      urgency_level: input.urgencyLevel
    })
  });

  const response = await withTimeout(request, 2500);
  if (!response.ok) {
    throw new Error(`Bodhi request failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!isValidDecision(payload)) {
    return null;
  }

  return payload;
};

const resolveGuidance = async (
  input: BodhiDecisionInput,
  fallback: AdapterGuidance
): Promise<AdapterGuidance> => {
  if (!useRealBodhi) {
    lastSource = "mock";
    return fallback;
  }

  try {
    const decision = await requestBodhiDecision(input);
    if (!decision) {
      lastSource = "mock";
      return fallback;
    }

    lastSource = "live";
    return {
      text: decision.response,
      confidence: normalizeConfidence(decision.confidence)
    };
  } catch {
    lastSource = "mock";
    return fallback;
  }
};

export const bodhiAgentAdapter = {
  getSourceLabel(): string {
    return lastSource === "live" ? "Bodhi live active" : "Bodhi fallback active";
  },

  async getPrioritizedAction(input: BodhiDecisionInput): Promise<AdapterGuidance> {
    return resolveGuidance(input, mockGuidanceForUrgency(input.urgencyLevel));
  },

  async handleInterruption(input: BodhiDecisionInput): Promise<AdapterGuidance> {
    return resolveGuidance(input, mockInterruptionGuidance());
  },

  async reactToVisualEvent(input: BodhiDecisionInput): Promise<AdapterGuidance> {
    return resolveGuidance(input, mockVisualEventGuidance());
  }
};
