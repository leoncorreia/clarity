import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Radio } from "lucide-react";

export interface TranscriptLine {
  id: string;
  speaker: "user" | "clarity" | "system";
  text: string;
  time: string;
  urgent?: boolean;
}

export function TranscriptPanel({ lines, live }: { lines: TranscriptLine[]; live: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-primary" />
          Live Transcript
        </span>
        <span className="flex items-center gap-1.5 text-[0.65rem] normal-case tracking-normal">
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-success animate-blink-dot" : "bg-muted-foreground")} />
          <span className="mono text-muted-foreground">{live ? "STREAM ACTIVE" : "STANDBY"}</span>
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="animate-ticker">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "mono text-[0.6rem] tracking-[0.2em] uppercase",
                  line.speaker === "user" && "text-muted-foreground",
                  line.speaker === "clarity" && "text-primary",
                  line.speaker === "system" && "text-warning",
                )}
              >
                {line.speaker === "user" ? "Operator" : line.speaker === "clarity" ? "Clarity" : "System"}
              </span>
              <span className="mono text-[0.6rem] text-muted-foreground/70">{line.time}</span>
              {line.urgent && (
                <span className="mono text-[0.6rem] text-critical border border-critical/40 px-1 rounded-sm">URGENT</span>
              )}
              <span className="flex-1 h-px bg-border" />
            </div>
            <p
              className={cn(
                "text-sm leading-relaxed pl-0",
                line.speaker === "user" && "text-foreground",
                line.speaker === "clarity" && "text-foreground border-l-2 border-primary/60 pl-3",
                line.speaker === "system" && "text-warning/90 mono text-xs uppercase tracking-wider",
                line.urgent && "text-critical border-l-2 border-critical pl-3",
              )}
            >
              {line.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
