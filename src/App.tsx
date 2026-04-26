import { useMemo, useReducer, useState } from "react";
import {
  clarityReducer,
  initialState,
  type ClarityMode,
  type TranscriptEntry,
  type SceneEvent
} from "./state/clarityStateMachine";
import { oxygenDropEvent } from "./data/scenarios";
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

function App() {
  const [state, dispatch] = useReducer(clarityReducer, initialState);
  const [bodhiStatusLabel, setBodhiStatusLabel] = useState<string>(
    bodhiAgentAdapter.getSourceLabel()
  );
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

  const runTalkSequence = (guidance: { text: string; confidence: number }): void => {
    dispatch({ type: "SET_MODE", payload: "listening" });
    window.setTimeout(() => {
      dispatch({ type: "SET_MODE", payload: "reasoning" });
      window.setTimeout(() => {
        dispatch({
          type: "TALK",
          payload: {
            userSpeech: "Patient is not responding. What should I do first?",
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
            : `${snapshot.observedContext} (PhyAgentOS mock fallback)`;
      sceneEvents = snapshot.events;
    } catch {
      const fallback = await phyAgentOSAdapter.getSceneSnapshot();
      observedContext = `${fallback.observedContext} (PhyAgentOS fallback after feed error)`;
      sceneEvents = fallback.events;
    }

    dispatch({
      type: "START_SCENARIO",
      payload: {
        sceneEvents,
        openingResponse:
          "I see an unconscious patient and a possible airway risk. Check airway and pulse first.",
        observedContext
      }
    });
  };

  const onTalk = async (): Promise<void> => {
    const guidance = await bodhiAgentAdapter.getPrioritizedAction({
      userInput: "Patient is not responding. What should I do first?",
      sceneContext: sceneSummary,
      urgencyLevel: state.urgencyLevel
    });
    setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
    runTalkSequence(guidance);
  };

  const onInterrupt = async (): Promise<void> => {
    const response = await bodhiAgentAdapter.handleInterruption({
      userInput: "Wait, there is heavy bleeding from the leg.",
      sceneContext: sceneSummary,
      urgencyLevel: Math.min(4, state.urgencyLevel + 1)
    });
    setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
    dispatch({
      type: "INTERRUPT",
      payload: {
        userSpeech: "Wait, there is heavy bleeding from the leg.",
        response
      }
    });
  };

  const onAddVisualEvent = async (): Promise<void> => {
    const response = await bodhiAgentAdapter.reactToVisualEvent({
      userInput: "Left monitor shows oxygen dropping.",
      sceneContext: sceneSummary,
      urgencyLevel: state.urgencyLevel
    });
    setBodhiStatusLabel(bodhiAgentAdapter.getSourceLabel());
    dispatch({
      type: "ADD_VISUAL_EVENT",
      payload: {
        event: oxygenDropEvent,
        response
      }
    });
  };

  const onEscalateUrgency = (): void => {
    dispatch({ type: "ESCALATE_URGENCY" });
  };

  const onReset = (): void => {
    dispatch({ type: "RESET" });
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
        </div>
      </main>
    </div>
  );
}

export default App;
