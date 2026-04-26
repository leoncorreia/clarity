import { cn } from "../../lib/utils";
import { Brain, Target, Gauge, Zap } from "lucide-react";

export interface ReasoningState {
  priority: string;
  nextAction: string;
  confidence: number; // 0-100
  urgency: "low" | "moderate" | "high" | "critical";
}

const urgencyMap = {
  low: { label: "LOW", color: "text-primary", bar: "bg-primary" },
  moderate: { label: "MODERATE", color: "text-primary", bar: "bg-primary" },
  high: { label: "HIGH", color: "text-warning", bar: "bg-warning" },
  critical: { label: "CRITICAL", color: "text-critical", bar: "bg-critical" },
};

export function ReasoningPanel({ state }: { state: ReasoningState }) {
  const u = urgencyMap[state.urgency];
  const urgencyLevel = state.urgency === "low" ? 25 : state.urgency === "moderate" ? 50 : state.urgency === "high" ? 75 : 100;

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          Agent Reasoning
        </span>
        <span className="mono text-[0.65rem] normal-case tracking-normal text-muted-foreground">
          BODHI · v2.4
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Priority */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            <Target className="h-3 w-3" /> Current Priority
          </div>
          <p className="text-sm font-medium text-foreground">{state.priority}</p>
        </div>

        <div className="h-px bg-border" />

        {/* Next action */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            <Zap className="h-3 w-3" /> Next Recommended Action
          </div>
          <p className="text-sm text-foreground leading-relaxed">{state.nextAction}</p>
        </div>

        <div className="h-px bg-border" />

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Gauge className="h-3 w-3" /> Confidence</span>
            <span className="mono text-foreground normal-case tracking-normal">{state.confidence}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${state.confidence}%`, boxShadow: "0 0 12px var(--primary)" }}
            />
          </div>
        </div>

        {/* Urgency */}
        <div>
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            <span>Urgency Level</span>
            <span className={cn("mono normal-case tracking-normal", u.color)}>{u.label}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((i) => {
              const filled = urgencyLevel >= i * 25;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-sm transition-colors",
                    filled ? u.bar : "bg-muted",
                    filled && state.urgency === "critical" && "animate-blink-dot",
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
