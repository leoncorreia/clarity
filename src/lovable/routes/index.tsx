import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssistantOrb, type AssistantState } from "@/components/clarity/AssistantOrb";
import { ScenePanel } from "@/components/clarity/ScenePanel";
import { TranscriptPanel, type TranscriptLine } from "@/components/clarity/TranscriptPanel";
import { ReasoningPanel, type ReasoningState } from "@/components/clarity/ReasoningPanel";
import { ControlPanel } from "@/components/clarity/ControlPanel";
import { SponsorStack } from "@/components/clarity/SponsorStack";
import { TopBar } from "@/components/clarity/TopBar";
import { ScenarioSelector } from "@/components/clarity/ScenarioSelector";
import { defaultScenarioId, getScenario, type PerceivedEntity } from "@/data/scenarios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clarity · Spatial Intelligence Console" },
      { name: "description", content: "Real-time embodied AI that observes any environment and generates domain-specific guidance." },
    ],
  }),
  component: ClarityDashboard,
});

const now = () => new Date().toISOString().split("T")[1].split(".")[0];

function seedTranscript(scenarioId: string): TranscriptLine[] {
  return getScenario(scenarioId).transcript.map((l, i) => ({
    ...l,
    id: `${scenarioId}-seed-${i}`,
  }));
}

function ClarityDashboard() {
  const [scenarioId, setScenarioId] = useState<string>(defaultScenarioId);
  const scenario = useMemo(() => getScenario(scenarioId), [scenarioId]);

  const [assistantState, setAssistantState] = useState<AssistantState>("listening");
  const [entities, setEntities] = useState<PerceivedEntity[]>(scenario.entities);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(seedTranscript(scenarioId));
  const [reasoning, setReasoning] = useState<ReasoningState>(scenario.reasoning);
  const [talking, setTalking] = useState(false);
  const eventCounter = useRef(0);

  // Reload on scenario change
  useEffect(() => {
    setEntities(scenario.entities);
    setTranscript(seedTranscript(scenarioId));
    setReasoning(scenario.reasoning);
    setAssistantState("listening");
    setTalking(false);
    eventCounter.current = 0;
  }, [scenarioId, scenario]);

  // Cycle assistant states
  useEffect(() => {
    if (assistantState === "urgent" || assistantState === "interrupted") return;
    const seq: AssistantState[] = ["listening", "thinking", "speaking"];
    const id = setInterval(() => {
      setAssistantState((s) => {
        const i = seq.indexOf(s);
        return seq[(i + 1) % seq.length] ?? "listening";
      });
    }, 4200);
    return () => clearInterval(id);
  }, [assistantState]);

  // Subtle confidence wobble
  useEffect(() => {
    const id = setInterval(() => {
      setReasoning((r) => ({ ...r, confidence: Math.max(78, Math.min(98, r.confidence + (Math.random() * 6 - 3)) | 0) }));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const addLine = (line: Omit<TranscriptLine, "id" | "time">) =>
    setTranscript((t) => [...t.slice(-40), { ...line, id: crypto.randomUUID(), time: now() }]);

  const isUrgent = assistantState === "urgent";

  const handlers = useMemo(() => ({
    onStart: () => {
      setAssistantState("listening");
      addLine({ speaker: "system", text: `Scenario engaged · ${scenario.name}` });
    },
    onTalk: () => {
      setTalking((v) => !v);
      setAssistantState("listening");
      addLine({ speaker: "user", text: "Clarity, give me a status update." });
      setTimeout(() => {
        setAssistantState("thinking");
        setTimeout(() => {
          setAssistantState("speaking");
          addLine({
            speaker: "clarity",
            text: `Top priority: ${scenario.reasoning.priority}. Next action: ${scenario.reasoning.nextAction}.`,
          });
        }, 900);
      }, 600);
    },
    onInterrupt: () => {
      setAssistantState("interrupted");
      addLine({ speaker: "system", text: "Operator interrupt · Clarity yielding" });
      setTimeout(() => setAssistantState("listening"), 1800);
    },
    onAddEvent: () => {
      const pool = scenario.additionalEvents ?? [];
      if (pool.length === 0) {
        addLine({ speaker: "system", text: "No additional events queued for this scenario" });
        return;
      }
      const ev = { ...pool[eventCounter.current % pool.length], id: crypto.randomUUID(), timestamp: now() };
      eventCounter.current += 1;
      setEntities((s) => [ev, ...s].slice(0, 8));
      addLine({ speaker: "system", text: `New event ingested · ${ev.title}` });
    },
    onEscalate: () => {
      setAssistantState("urgent");
      setReasoning((r) => ({
        ...r,
        priority: `PRIORITY OVERRIDE · ${scenario.reasoning.priority}`,
        urgency: "critical",
        confidence: Math.max(r.confidence, 94),
      }));
      addLine({
        speaker: "clarity",
        text: `Priority override engaged. ${scenario.reasoning.nextAction}.`,
        urgent: true,
      });
    },
    onReset: () => {
      setEntities(scenario.entities);
      setTranscript(seedTranscript(scenarioId));
      setReasoning(scenario.reasoning);
      setAssistantState("listening");
      setTalking(false);
      eventCounter.current = 0;
    },
  }), [scenario, scenarioId]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        urgent={isUrgent}
        sector={scenario.sector}
        protocol={scenario.protocol}
        rightSlot={<ScenarioSelector scenarioId={scenarioId} onChange={setScenarioId} />}
      />

      <main className="flex-1 grid gap-3 p-3 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:h-[calc(100vh-65px)]">
        <div className="panel relative overflow-hidden lg:col-span-5 lg:row-span-2">
          <div className="panel-header">
            <span>Clarity Core</span>
            <span className="mono text-[0.65rem] normal-case tracking-normal text-muted-foreground">
              PhyAgentOS · {scenario.domain}
            </span>
          </div>
          <AssistantOrb state={assistantState} />
        </div>

        <div className="lg:col-span-4 lg:row-span-2 min-h-[320px]">
          <ScenePanel entities={entities} domain={scenario.domain} />
        </div>

        <div className="lg:col-span-3 min-h-[280px]">
          <ReasoningPanel state={reasoning} />
        </div>

        <div className="lg:col-span-3 min-h-[280px]">
          <TranscriptPanel lines={transcript} live />
        </div>

        <div className="lg:col-span-8">
          <ControlPanel
            onStart={handlers.onStart}
            onTalk={handlers.onTalk}
            onInterrupt={handlers.onInterrupt}
            onAddEvent={handlers.onAddEvent}
            onEscalate={handlers.onEscalate}
            onReset={handlers.onReset}
            talking={talking}
          />
        </div>

        <div className="lg:col-span-4">
          <SponsorStack />
        </div>
      </main>
    </div>
  );
}
