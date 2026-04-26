import { useMemo, useReducer, useState } from "react";
import { ClarityAvatar } from "./components/ClarityAvatar";
import { ScenePanel } from "./components/ScenePanel";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { AgentStatusPanel } from "./components/AgentStatusPanel";
import { ControlPanel } from "./components/ControlPanel";
import {
  clarityReducer,
  initialState,
  type AdapterGuidance,
  type SceneEvent
} from "./state/clarityStateMachine";
import {
  oxygenDropEvent
} from "./data/scenarios";
import { bodhiAgentAdapter } from "./adapters/bodhiAgentAdapter";
import { phyAgentOSAdapter } from "./adapters/phyAgentOSAdapter";
import { lovableUIAdapter } from "./adapters/lovableUIAdapter";
import "./styles.css";

function App() {
  const [state, dispatch] = useReducer(clarityReducer, initialState);
  const [bodhiStatusLabel, setBodhiStatusLabel] = useState<string>(
    bodhiAgentAdapter.getSourceLabel()
  );
  const renderDeployment =
    (import.meta.env.VITE_RENDER_DEPLOYMENT as string | undefined) === "true";

  const tone = lovableUIAdapter.getTone(state.urgencyLevel);

  const sceneSummary = useMemo(
    () => phyAgentOSAdapter.summarizeContext(state.sceneEvents),
    [state.sceneEvents]
  );

  const runTalkSequence = (guidance: AdapterGuidance): void => {
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
    <main className={`app-shell urgency-${state.urgencyLevel}`}>
      <header className="topbar">
        <div>
          <h1>Clarity</h1>
          <p>{lovableUIAdapter.heroTagline}</p>
        </div>
        <div className="failure-callout">
          {renderDeployment ? <div className="infra-badge">Running on Render</div> : null}
          <strong>Why text-only fails:</strong> time pressure, occupied hands, changing scene,
          spatial guidance required.
        </div>
      </header>

      <section className="grid-layout">
        <ClarityAvatar
          mode={state.mode}
          urgencyLevel={state.urgencyLevel}
          gazeTarget={state.gazeTarget}
          expression={state.expression}
          postureText={state.postureText}
        />

        <ScenePanel events={state.sceneEvents} />

        <TranscriptPanel entries={state.transcript} />

        <AgentStatusPanel
          status={{ ...state.agentStatus, observedContext: `${state.agentStatus.observedContext} ${sceneSummary}` }}
          tone={tone}
          bodhiStatusLabel={bodhiStatusLabel}
        />

        <ControlPanel
          onStart={onStart}
          onTalk={() => {
            void onTalk();
          }}
          onInterrupt={() => {
            void onInterrupt();
          }}
          onAddVisualEvent={() => {
            void onAddVisualEvent();
          }}
          onEscalateUrgency={onEscalateUrgency}
          onReset={onReset}
          scenarioStarted={state.scenarioStarted}
        />
      </section>
    </main>
  );
}

export default App;
