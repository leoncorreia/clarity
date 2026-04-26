import { useMemo, useReducer, useState } from "react";
import {
  clarityReducer,
  initialState,
  type ClarityMode,
  type TranscriptEntry,
  type SceneEvent
} from "./state/clarityStateMachine";
import { bodhiAgentAdapter } from "./adapters/bodhiAgentAdapter";
import { phyAgentOSAdapter } from "./adapters/phyAgentOSAdapter";
import { spatialRealAdapter } from "./adapters/spatialRealAdapter";
import { TopBar } from "./lovable/components/clarity/TopBar";
import { AssistantOrb, type AssistantState } from "./lovable/components/clarity/AssistantOrb";
import { ScenePanel } from "./lovable/components/clarity/ScenePanel";
import { TranscriptPanel, type TranscriptLine } from "./lovable/components/clarity/TranscriptPanel";
import { ReasoningPanel, type ReasoningState } from "./lovable/components/clarity/ReasoningPanel";
import { ControlPanel } from "./lovable/components/clarity/ControlPanel";
import type { PerceivedEntity } from "./lovable/data/scenarios";
import "./styles.css";

const toAssistantState = (mode: ClarityMode, urgencyLevel: number): AssistantState => {
  if (urgencyLevel >= 4 || mode === "urgent") return "urgent";
  if (mode === "interrupted") return "interrupted";
  if (mode === "speaking") return "speaking";
  if (mode === "reasoning") return "thinking";
  return "listening";
};

const toPerceivedEntity = (eventItem: SceneEvent): PerceivedEntity => ({
  id: eventItem.id,
  title: eventItem.label,
  description: `${eventItem.type} signal in ${eventItem.zone} zone`,
  severity:
    eventItem.severity === "critical"
      ? "critical"
      : eventItem.severity === "high"
        ? "warning"
        : eventItem.severity === "medium"
          ? "info"
          : "nominal",
  category: eventItem.type,
  location: `${eventItem.zone.toUpperCase()} zone`,
  confidence:
    eventItem.severity === "critical"
      ? 0.96
      : eventItem.severity === "high"
        ? 0.89
        : eventItem.severity === "medium"
          ? 0.8
          : 0.74,
  timestamp: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }),
  source: eventItem.type === "noise" ? "audio" : eventItem.type === "monitor" ? "sensor" : "vision",
  recommendedAction: eventItem.label
});

const toTranscriptLine = (entry: TranscriptEntry): TranscriptLine => ({
  id: entry.id,
  speaker: entry.speaker === "responder" ? "user" : entry.speaker,
  text: entry.text,
  time: entry.timestamp,
  urgent: entry.interrupted
});

const toReasoningState = (
  inferredUrgency: string,
  nextAction: string,
  confidence: number
): ReasoningState => ({
  priority: inferredUrgency,
  nextAction,
  confidence: Math.round(confidence * 100),
  urgency:
    inferredUrgency.toLowerCase() === "critical"
      ? "critical"
      : inferredUrgency.toLowerCase() === "high"
        ? "high"
        : inferredUrgency.toLowerCase() === "elevated" || inferredUrgency.toLowerCase() === "moderate"
          ? "moderate"
          : "low"
});

const createLiveSceneEvent = (text: string): SceneEvent => ({
  id: `live-${Date.now()}`,
  label: text,
  type: text.toLowerCase().includes("monitor") || text.toLowerCase().includes("oxygen") ? "monitor" : "risk",
  zone: text.toLowerCase().includes("left")
    ? "left"
    : text.toLowerCase().includes("right")
      ? "right"
      : "center",
  severity: text.toLowerCase().includes("critical") || text.toLowerCase().includes("heavy")
    ? "critical"
    : text.toLowerCase().includes("high")
      ? "high"
      : "medium"
});

function App() {
  const [state, dispatch] = useReducer(clarityReducer, initialState);
  const [bodhiStatusLabel, setBodhiStatusLabel] = useState<string>(
    bodhiAgentAdapter.getSourceLabel()
  );
  const [operatorInput, setOperatorInput] = useState<string>("");
  const [sceneEventInput, setSceneEventInput] = useState<string>("");
  const [runtimeError, setRuntimeError] = useState<string>("");
  const renderDeployment =
    (import.meta.env.VITE_RENDER_DEPLOYMENT as string | undefined) === "true";
  const spatialAvatar = spatialRealAdapter.getAvatarConfig();

  const sceneSummary = useMemo(
    () => phyAgentOSAdapter.summarizeContext(state.sceneEvents),
    [state.sceneEvents]
  );

  const entities = useMemo(
    () => state.sceneEvents.map(toPerceivedEntity),
    [state.sceneEvents]
  );
  const transcriptLines = useMemo(
    () => state.transcript.map(toTranscriptLine),
    [state.transcript]
  );
  const assistantState = useMemo(
    () => toAssistantState(state.mode, state.urgencyLevel),
    [state.mode, state.urgencyLevel]
  );
  const reasoningState = useMemo(
    () =>
      toReasoningState(
        state.agentStatus.inferredUrgency,
        `${state.agentStatus.nextRecommendedAction} · ${bodhiStatusLabel}`,
        state.agentStatus.confidence
      ),
    [state.agentStatus, bodhiStatusLabel]
  );

  const runTalkSequence = (
    userSpeech: string,
    guidance: { text: string; confidence: number }
  ): void => {
    dispatch({ type: "SET_MODE", payload: "listening" });
    window.setTimeout(() => {
      dispatch({ type: "SET_MODE", payload: "reasoning" });
      window.setTimeout(() => {
        dispatch({
          type: "TALK",
          payload: {
            userSpeech,
            response: guidance
          }
        });
      }, 350);
    }, 350);
  };

  const onStart = async (): Promise<void> => {
    let observedContext: string;
    let sceneEvents: SceneEvent[];

    try {
      const snapshot = await phyAgentOSAdapter.getSceneSnapshot();
      observedContext =
        snapshot.source === "workspace"
          ? `${snapshot.observedContext} (PhyAgentOS workspace feed)`
          : snapshot.source === "live"
            ? `${snapshot.observedContext} (PhyAgentOS live feed)`
            : snapshot.observedContext;
      sceneEvents = snapshot.events;
      setRuntimeError("");
    } catch (error) {
      observedContext =
        "Live scene feed unavailable. Enter operator observations manually to continue.";
      sceneEvents = [];
      setRuntimeError(error instanceof Error ? error.message : "Unable to connect live scene feed.");
    }

    dispatch({
      type: "START_SCENARIO",
      payload: {
        sceneEvents,
        openingResponse:
          "Live session engaged. Awaiting operator input.",
        observedContext
      }
    });
  };

  const onTalk = async (): Promise<void> => {
    const trimmedInput = operatorInput.trim();
    if (!trimmedInput) {
      setRuntimeError("Enter a live operator prompt before using Talk.");
      return;
    }

    const userSpeech = trimmedInput;

    try {
      const guidance = await bodhiAgentAdapter.getPrioritizedAction({
        userInput: userSpeech,
        sceneContext: sceneSummary,
        urgencyLevel: state.urgencyLevel
      });
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError("");
      runTalkSequence(userSpeech, guidance);
    } catch (error) {
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError(error instanceof Error ? error.message : "Bodhi live call failed.");
    }
  };

  const onInterrupt = async (): Promise<void> => {
    const userInput = operatorInput.trim();
    if (!userInput) {
      setRuntimeError("Enter interruption text from the operator first.");
      return;
    }

    try {
      const response = await bodhiAgentAdapter.handleInterruption({
        userInput,
        sceneContext: sceneSummary,
        urgencyLevel: Math.min(4, state.urgencyLevel + 1)
      });
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError("");
      dispatch({
        type: "INTERRUPT",
        payload: {
          userSpeech: userInput,
          response
        }
      });
    } catch (error) {
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError(error instanceof Error ? error.message : "Bodhi interruption call failed.");
    }
  };

  const onAddVisualEvent = async (): Promise<void> => {
    const eventText = sceneEventInput.trim();
    if (!eventText) {
      setRuntimeError("Enter a live scene event before adding visual event.");
      return;
    }

    try {
      const response = await bodhiAgentAdapter.reactToVisualEvent({
        userInput: eventText,
        sceneContext: sceneSummary,
        urgencyLevel: state.urgencyLevel
      });
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError("");
      dispatch({
        type: "ADD_VISUAL_EVENT",
        payload: {
          event: createLiveSceneEvent(eventText),
          response
        }
      });
      setSceneEventInput("");
    } catch (error) {
      setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
      setRuntimeError(error instanceof Error ? error.message : "Bodhi visual-event call failed.");
    }
  };

  const onEscalateUrgency = (): void => {
    dispatch({ type: "ESCALATE_URGENCY" });
  };

  const onReset = (): void => {
    dispatch({ type: "RESET" });
    setRuntimeError("");
    setOperatorInput("");
    setSceneEventInput("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        urgent={assistantState === "urgent"}
        sector="SECTOR 04-B"
        protocol="Field Response Protocol v3.2"
        rightSlot={
          <div className="mono text-[0.65rem] text-muted-foreground">
            {renderDeployment ? "Render production" : "Local preview"}
          </div>
        }
      />

      <main className="flex-1 grid gap-3 p-3 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:h-[calc(100vh-65px)]">
        <div className="panel relative overflow-hidden lg:col-span-5 lg:row-span-2">
          <div className="panel-header">
            <span>Clarity Core</span>
            <span className="mono text-[0.65rem] normal-case tracking-normal text-muted-foreground">
              SpatialReal {spatialAvatar.liveEnabled ? "live" : "mock"} · Bodhi · Render
            </span>
          </div>
          <AssistantOrb state={assistantState} />
        </div>

        <div className="lg:col-span-4 lg:row-span-2 min-h-[320px]">
          <ScenePanel entities={entities} domain="Emergency Response" />
        </div>

        <div className="lg:col-span-3 min-h-[280px]">
          <ReasoningPanel state={reasoningState} />
        </div>

        <div className="lg:col-span-3 min-h-[280px]">
          <TranscriptPanel lines={transcriptLines} live />
        </div>

        <div className="lg:col-span-8">
          <ControlPanel
            onStart={() => {
              void onStart();
            }}
            onTalk={() => {
              void onTalk();
            }}
            onInterrupt={() => {
              void onInterrupt();
            }}
            onAddEvent={() => {
              void onAddVisualEvent();
            }}
            onEscalate={onEscalateUrgency}
            onReset={onReset}
            talking={state.mode === "listening" || state.mode === "reasoning" || state.mode === "speaking"}
          />
        </div>

        <div className="lg:col-span-4 panel p-4">
          <h3 className="text-sm font-semibold">Operational Context</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {state.agentStatus.observedContext} {sceneSummary}
          </p>
          <p className="mono text-[0.65rem] text-muted-foreground mt-3">
            Bodhi status: {bodhiStatusLabel}
          </p>
          <p className="mono text-[0.65rem] text-muted-foreground mt-1">
            SpatialReal avatar: {spatialAvatar.avatarId}
          </p>
          <div className="mt-3 grid gap-2">
            <label className="mono text-[0.65rem] text-muted-foreground">Operator input</label>
            <input
              value={operatorInput}
              onChange={(event) => setOperatorInput(event.target.value)}
              placeholder="Type live responder speech..."
              className="w-full rounded-md border border-border bg-[oklch(0.22_0.02_240)] px-2 py-1 text-xs"
            />
            <label className="mono text-[0.65rem] text-muted-foreground">Scene event input</label>
            <input
              value={sceneEventInput}
              onChange={(event) => setSceneEventInput(event.target.value)}
              placeholder="Example: Left monitor oxygen dropping rapidly"
              className="w-full rounded-md border border-border bg-[oklch(0.22_0.02_240)] px-2 py-1 text-xs"
            />
            {runtimeError ? (
              <p className="text-[0.7rem] text-critical mt-1">{runtimeError}</p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
