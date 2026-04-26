import type { SceneEvent } from "../state/clarityStateMachine";

interface ScenePanelProps {
  events: SceneEvent[];
}

const severityWeight = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function ScenePanel({ events }: ScenePanelProps) {
  const sorted = [...events].sort(
    (a, b) => severityWeight[b.severity] - severityWeight[a.severity]
  );

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Live Scene Context</h2>
        <span className="meta">Spatially grounded</span>
      </header>
      <ul className="event-list">
        {sorted.map((eventItem) => (
          <li key={eventItem.id} className={`event-card severity-${eventItem.severity}`}>
            <div className="event-topline">
              <strong>{eventItem.label}</strong>
              <span>{eventItem.severity.toUpperCase()}</span>
            </div>
            <div className="event-subline">
              <span>Zone: {eventItem.zone}</span>
              <span>Type: {eventItem.type}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
