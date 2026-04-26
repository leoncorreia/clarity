import type { SceneEvent } from "../state/clarityStateMachine";
import { baseSceneEvents, openingObservation } from "../data/scenarios";

type AdapterMode = "mock" | "workspace" | "live" | "hybrid";

interface RawPhyAgentEvent {
  id?: string;
  label?: string;
  type?: SceneEvent["type"];
  zone?: SceneEvent["zone"];
  severity?: SceneEvent["severity"];
}

interface RawPhyAgentSnapshot {
  observedContext?: string;
  events?: RawPhyAgentEvent[];
}

export interface PhyAgentSceneSnapshot {
  source: "mock" | "workspace" | "live";
  observedContext: string;
  events: SceneEvent[];
}

const workspaceEndpoint = import.meta.env.VITE_PHYAGENT_WORKSPACE_ENDPOINT as
  | string
  | undefined;
const endpoint = import.meta.env.VITE_PHYAGENT_ENDPOINT as string | undefined;
const apiKey = import.meta.env.VITE_PHYAGENT_API_KEY as string | undefined;
const mode = (import.meta.env.VITE_PHYAGENT_MODE as AdapterMode | undefined) ?? "mock";

const isType = (value: string | undefined): value is SceneEvent["type"] =>
  value === "patient" ||
  value === "risk" ||
  value === "monitor" ||
  value === "noise" ||
  value === "hazard";

const isZone = (value: string | undefined): value is SceneEvent["zone"] =>
  value === "left" || value === "center" || value === "right";

const isSeverity = (value: string | undefined): value is SceneEvent["severity"] =>
  value === "low" || value === "medium" || value === "high" || value === "critical";

const toSceneEvent = (eventItem: RawPhyAgentEvent, index: number): SceneEvent | null => {
  if (!isType(eventItem.type) || !isZone(eventItem.zone) || !isSeverity(eventItem.severity)) {
    return null;
  }

  return {
    id: eventItem.id ?? `phyagent-${index}-${Date.now()}`,
    label: eventItem.label ?? "Unnamed scene signal",
    type: eventItem.type,
    zone: eventItem.zone,
    severity: eventItem.severity
  };
};

const getMockSnapshot = (): PhyAgentSceneSnapshot => ({
  source: "mock",
  observedContext: openingObservation,
  events: baseSceneEvents
});

const fetchSnapshot = async (
  requestEndpoint: string | undefined,
  source: "workspace" | "live"
): Promise<PhyAgentSceneSnapshot | null> => {
  if (!requestEndpoint) {
    return null;
  }

  const response = await fetch(requestEndpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`PhyAgentOS fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as RawPhyAgentSnapshot;
  const events = (payload.events ?? [])
    .map((eventItem, index) => toSceneEvent(eventItem, index))
    .filter((eventItem): eventItem is SceneEvent => eventItem !== null);

  if (events.length === 0) {
    return null;
  }

  return {
    source,
    observedContext:
      payload.observedContext ??
      (source === "workspace"
        ? "PhyAgentOS workspace feed active"
        : "Live scene feed active"),
    events
  };
};

const normalizeSnapshot = (
  snapshot: PhyAgentSceneSnapshot
): PhyAgentSceneSnapshot => ({
  ...snapshot,
  observedContext:
    snapshot.source === "workspace"
      ? `${snapshot.observedContext} (workspace-derived)`
      : snapshot.observedContext
});

export const phyAgentOSAdapter = {
  getMode(): AdapterMode {
    return mode;
  },

  async getSceneSnapshot(): Promise<PhyAgentSceneSnapshot> {
    if (mode === "mock") {
      return getMockSnapshot();
    }

    const attempts: Array<() => Promise<PhyAgentSceneSnapshot | null>> =
      mode === "workspace"
        ? [() => fetchSnapshot(workspaceEndpoint, "workspace")]
        : mode === "live"
          ? [() => fetchSnapshot(endpoint, "live")]
          : [
              () => fetchSnapshot(workspaceEndpoint, "workspace"),
              () => fetchSnapshot(endpoint, "live")
            ];

    for (const attempt of attempts) {
      try {
        const snapshot = await attempt();
        if (snapshot) {
          return normalizeSnapshot(snapshot);
        }
      } catch (error) {
        if (mode === "live" || mode === "workspace") {
          throw error;
        }
      }
    }

    return getMockSnapshot();
  },

  summarizeContext(events: SceneEvent[]): string {
    const critical = events.filter((eventItem) => eventItem.severity === "critical").map((eventItem) => eventItem.label);
    const high = events.filter((eventItem) => eventItem.severity === "high").map((eventItem) => eventItem.label);

    return `Critical: ${critical.join(", ") || "none"}. High: ${high.join(", ") || "none"}.`;
  }
};
