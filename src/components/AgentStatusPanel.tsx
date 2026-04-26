import type { AgentStatus } from "../state/clarityStateMachine";

interface AgentStatusPanelProps {
  status: AgentStatus;
  tone: "calm" | "directive";
  bodhiStatusLabel: string;
}

export function AgentStatusPanel({
  status,
  tone,
  bodhiStatusLabel
}: AgentStatusPanelProps) {
  const bodhiLive = bodhiStatusLabel === "Bodhi live active";

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Agent Reasoning Status</h2>
        <div className="status-pills">
          <span className={`tone-pill tone-${tone}`}>{tone}</span>
          <span className={`bodhi-pill ${bodhiLive ? "bodhi-live" : "bodhi-fallback"}`}>
            {bodhiStatusLabel}
          </span>
        </div>
      </header>
      <dl className="status-grid">
        <div>
          <dt>Observed context</dt>
          <dd>{status.observedContext}</dd>
        </div>
        <div>
          <dt>Inferred urgency</dt>
          <dd>{status.inferredUrgency}</dd>
        </div>
        <div>
          <dt>Next action</dt>
          <dd>{status.nextRecommendedAction}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(status.confidence * 100)}%</dd>
        </div>
        <div>
          <dt>Active sponsor layer</dt>
          <dd>{status.activeSponsorLayer}</dd>
        </div>
      </dl>
    </section>
  );
}
