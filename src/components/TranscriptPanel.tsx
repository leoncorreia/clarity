import type { TranscriptEntry } from "../state/clarityStateMachine";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  return (
    <section className="panel transcript-panel">
      <header className="panel-header">
        <h2>Real-Time Transcript</h2>
        <span className="meta">Hands-free command flow</span>
      </header>
      <div className="transcript-list">
        {entries.map((entry) => (
          <article key={entry.id} className={`line line-${entry.speaker}`}>
            <div className="line-meta">
              <span>{entry.speaker.toUpperCase()}</span>
              <span>{entry.timestamp}</span>
            </div>
            <p>
              {entry.interrupted ? "[Interrupted] " : ""}
              {entry.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
