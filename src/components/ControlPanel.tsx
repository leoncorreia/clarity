interface ControlPanelProps {
  onStart: () => void;
  onTalk: () => void;
  onInterrupt: () => void;
  onAddVisualEvent: () => void;
  onEscalateUrgency: () => void;
  onReset: () => void;
  scenarioStarted: boolean;
}

export function ControlPanel({
  onStart,
  onTalk,
  onInterrupt,
  onAddVisualEvent,
  onEscalateUrgency,
  onReset,
  scenarioStarted
}: ControlPanelProps) {
  return (
    <section className="panel control-panel">
      <header className="panel-header">
        <h2>Simulation Controls</h2>
      </header>
      <div className="control-grid">
        <button type="button" className="btn-primary" onClick={onStart}>
          Start scenario
        </button>
        <button type="button" onClick={onTalk} disabled={!scenarioStarted}>
          Talk
        </button>
        <button type="button" className="btn-warn" onClick={onInterrupt} disabled={!scenarioStarted}>
          Interrupt
        </button>
        <button type="button" onClick={onAddVisualEvent} disabled={!scenarioStarted}>
          Add visual event
        </button>
        <button type="button" className="btn-danger" onClick={onEscalateUrgency} disabled={!scenarioStarted}>
          Escalate urgency
        </button>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
