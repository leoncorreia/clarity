export type ClarityMode =
  | "idle"
  | "observing"
  | "listening"
  | "reasoning"
  | "speaking"
  | "interrupted"
  | "urgent";

export type TranscriptSpeaker = "responder" | "clarity" | "system";

export interface TranscriptEntry {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: string;
  interrupted?: boolean;
}

export interface SceneEvent {
  id: string;
  label: string;
  type: "patient" | "risk" | "monitor" | "noise" | "hazard";
  zone: "left" | "center" | "right";
  severity: "low" | "medium" | "high" | "critical";
}

export interface AgentStatus {
  observedContext: string;
  inferredUrgency: string;
  nextRecommendedAction: string;
  confidence: number;
  activeSponsorLayer: string;
}

export interface ClarityState {
  mode: ClarityMode;
  urgencyLevel: number;
  scenarioStarted: boolean;
  sceneEvents: SceneEvent[];
  transcript: TranscriptEntry[];
  agentStatus: AgentStatus;
  gazeTarget: "left" | "center" | "right";
  expression: "calm" | "focused" | "urgent" | "uncertain";
  postureText: string;
}

export interface AdapterGuidance {
  text: string;
  confidence: number;
}

const timestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const initialStatus: AgentStatus = {
  observedContext: "Awaiting scene feed",
  inferredUrgency: "Low",
  nextRecommendedAction: "Start scenario",
  confidence: 0.92,
  activeSponsorLayer: "Lovable UI"
};

export const initialState: ClarityState = {
  mode: "idle",
  urgencyLevel: 1,
  scenarioStarted: false,
  sceneEvents: [],
  transcript: [
    {
      id: "sys-boot",
      speaker: "system",
      text: "Clarity initialized. Voice channel ready.",
      timestamp: timestamp()
    }
  ],
  agentStatus: initialStatus,
  gazeTarget: "center",
  expression: "calm",
  postureText: "Standby"
};

export interface StartScenarioPayload {
  sceneEvents: SceneEvent[];
  openingResponse: string;
  observedContext: string;
}

export interface TalkPayload {
  userSpeech: string;
  response: AdapterGuidance;
}

export interface InterruptPayload {
  userSpeech: string;
  response: AdapterGuidance;
}

export interface AddEventPayload {
  event: SceneEvent;
  response: AdapterGuidance;
}

export type ClarityEvent =
  | { type: "START_SCENARIO"; payload: StartScenarioPayload }
  | { type: "TALK"; payload: TalkPayload }
  | { type: "INTERRUPT"; payload: InterruptPayload }
  | { type: "ADD_VISUAL_EVENT"; payload: AddEventPayload }
  | { type: "ESCALATE_URGENCY" }
  | { type: "SET_MODE"; payload: ClarityMode }
  | { type: "RESET" };

const newEntry = (
  speaker: TranscriptSpeaker,
  text: string,
  interrupted = false
): TranscriptEntry => ({
  id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  speaker,
  text,
  interrupted,
  timestamp: timestamp()
});

const urgencyLabel = (level: number): string => {
  if (level >= 4) return "Critical";
  if (level === 3) return "High";
  if (level === 2) return "Elevated";
  return "Moderate";
};

export const clarityReducer = (
  state: ClarityState,
  event: ClarityEvent
): ClarityState => {
  switch (event.type) {
    case "START_SCENARIO": {
      const { sceneEvents, openingResponse, observedContext } = event.payload;
      return {
        ...state,
        scenarioStarted: true,
        mode: "observing",
        sceneEvents,
        urgencyLevel: 2,
        gazeTarget: "center",
        expression: "focused",
        postureText: "Scanning scene",
        transcript: [
          ...state.transcript,
          newEntry("clarity", openingResponse)
        ],
        agentStatus: {
          observedContext,
          inferredUrgency: "Elevated",
          nextRecommendedAction: "Check airway and pulse",
          confidence: 0.94,
          activeSponsorLayer: "PhyAgentOS + SpatialReal"
        }
      };
    }

    case "SET_MODE": {
      const mode = event.payload;
      const expression =
        mode === "urgent" || state.urgencyLevel >= 4
          ? "urgent"
          : mode === "reasoning"
            ? "uncertain"
            : mode === "interrupted"
              ? "focused"
              : "calm";
      return {
        ...state,
        mode,
        expression,
        postureText:
          mode === "listening"
            ? "Listening continuously"
            : mode === "speaking"
              ? "Delivering guidance"
              : mode === "reasoning"
                ? "Updating tactical plan"
                : mode === "interrupted"
                  ? "Yielding, reprioritizing"
                  : state.postureText
      };
    }

    case "TALK": {
      const { userSpeech, response } = event.payload;
      return {
        ...state,
        mode: "speaking",
        gazeTarget: "center",
        expression: state.urgencyLevel >= 3 ? "focused" : "calm",
        postureText: "Guiding responder",
        transcript: [
          ...state.transcript,
          newEntry("responder", userSpeech),
          newEntry("clarity", response.text)
        ],
        agentStatus: {
          observedContext: "Patient unresponsive, airway risk persists",
          inferredUrgency: urgencyLabel(state.urgencyLevel),
          nextRecommendedAction: "Open airway, check pulse, prepare bleeding control",
          confidence: response.confidence,
          activeSponsorLayer: "Bodhi Agent"
        }
      };
    }

    case "INTERRUPT": {
      const { userSpeech, response } = event.payload;
      return {
        ...state,
        mode: "interrupted",
        urgencyLevel: Math.min(4, state.urgencyLevel + 1),
        gazeTarget: "right",
        expression: "urgent",
        postureText: "Interruption accepted",
        transcript: [
          ...state.transcript,
          newEntry("responder", userSpeech, true),
          newEntry("clarity", response.text)
        ],
        agentStatus: {
          observedContext: "Severe leg bleed now dominant threat",
          inferredUrgency: "High",
          nextRecommendedAction: "Apply direct pressure immediately",
          confidence: response.confidence,
          activeSponsorLayer: "Bodhi Agent + PhyAgentOS"
        }
      };
    }

    case "ADD_VISUAL_EVENT": {
      const { event: sceneEvent, response } = event.payload;
      return {
        ...state,
        mode: "reasoning",
        sceneEvents: [...state.sceneEvents, sceneEvent],
        gazeTarget: sceneEvent.zone,
        expression: state.urgencyLevel >= 3 ? "urgent" : "focused",
        postureText: "Integrating scene update",
        transcript: [...state.transcript, newEntry("clarity", response.text)],
        agentStatus: {
          observedContext: "Oxygen trend dropping on left monitor",
          inferredUrgency: urgencyLabel(Math.min(4, state.urgencyLevel + 1)),
          nextRecommendedAction: "Recheck airway; prep assisted breathing",
          confidence: response.confidence,
          activeSponsorLayer: "SpatialReal + PhyAgentOS"
        }
      };
    }

    case "ESCALATE_URGENCY": {
      const urgencyLevel = Math.min(4, state.urgencyLevel + 1);
      return {
        ...state,
        urgencyLevel,
        mode: urgencyLevel >= 4 ? "urgent" : state.mode,
        expression: urgencyLevel >= 3 ? "urgent" : "focused",
        postureText: urgencyLevel >= 4 ? "Critical command mode" : "Focused triage",
        transcript: [
          ...state.transcript,
          newEntry(
            "clarity",
            urgencyLevel >= 4
              ? "Critical. Airway, bleeding, oxygen. Execute now."
              : "Urgency rising. Keep commands short and hands free."
          )
        ],
        agentStatus: {
          ...state.agentStatus,
          inferredUrgency: urgencyLabel(urgencyLevel),
          nextRecommendedAction:
            urgencyLevel >= 4
              ? "Airway control and bleeding control immediately"
              : "Continue rapid reassessment"
        }
      };
    }

    case "RESET":
      return {
        ...initialState,
        transcript: [
          ...initialState.transcript,
          newEntry("system", "Scenario reset. Standing by for new incident.")
        ]
      };

    default:
      return state;
  }
};
