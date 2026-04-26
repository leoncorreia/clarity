import { cn } from "../../lib/utils";
import { Eye, AlertTriangle, Activity, Camera, Mic2, Radio, User, Cpu, MapPin } from "lucide-react";
import type { PerceivedEntity, Severity, SignalSource } from "../../data/scenarios";

const sevStyle: Record<Severity, { dot: string; text: string; bg: string; border: string; label: string; bar: string }> = {
  nominal: { dot: "bg-success", text: "text-success", bg: "bg-[oklch(0.78_0.18_155_/_0.06)]", border: "border-[oklch(0.78_0.18_155_/_0.25)]", label: "NOMINAL", bar: "bg-success" },
  info: { dot: "bg-primary", text: "text-primary", bg: "bg-primary/5", border: "border-primary/20", label: "INFO", bar: "bg-primary" },
  warning: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10", border: "border-[oklch(0.82_0.17_78_/_0.35)]", label: "WARNING", bar: "bg-warning" },
  critical: { dot: "bg-critical", text: "text-critical", bg: "bg-critical/10", border: "border-[oklch(0.68_0.24_22_/_0.45)]", label: "CRITICAL", bar: "bg-critical" },
};

const sourceIcon: Record<SignalSource, typeof Camera> = {
  vision: Camera,
  audio: Mic2,
  sensor: Activity,
  user_input: User,
  system: Cpu,
};

const sourceLabel: Record<SignalSource, string> = {
  vision: "VISION",
  audio: "AUDIO",
  sensor: "SENSOR",
  user_input: "OPERATOR",
  system: "SYSTEM",
};

interface Props {
  entities: PerceivedEntity[];
  domain: string;
}

export function ScenePanel({ entities, domain }: Props) {
  const counts = entities.reduce(
    (acc, e) => ((acc[e.severity] = (acc[e.severity] ?? 0) + 1), acc),
    {} as Record<Severity, number>,
  );

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          Scene Perception
        </span>
        <span className="mono text-[0.65rem] normal-case tracking-normal text-muted-foreground flex items-center gap-2">
          <span>{entities.length} entities</span>
          {(["critical", "warning", "info", "nominal"] as Severity[]).map((s) =>
            counts[s] ? (
              <span key={s} className={cn("flex items-center gap-1", sevStyle[s].text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", sevStyle[s].dot)} />
                {counts[s]}
              </span>
            ) : null,
          )}
        </span>
      </div>

      <div className="px-4 py-2 border-b border-border flex items-center justify-between text-[0.65rem] mono uppercase tracking-[0.18em] text-muted-foreground">
        <span>Domain · <span className="text-foreground">{domain}</span></span>
        <span className="flex items-center gap-1.5"><Radio className="h-3 w-3 text-success" /> ingesting</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entities.map((e) => {
          const s = sevStyle[e.severity];
          const SrcIcon = sourceIcon[e.source];
          return (
            <article
              key={e.id}
              className={cn("relative overflow-hidden rounded-md border p-3", s.bg, s.border)}
            >
              {e.severity === "critical" && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-critical animate-blink-dot" />
              )}

              <header className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={cn("mt-0.5 rounded-md p-1.5 border", s.bg, s.border)}>
                    {e.severity === "critical" || e.severity === "warning" ? (
                      <AlertTriangle className={cn("h-4 w-4", s.text)} />
                    ) : (
                      <Eye className={cn("h-4 w-4", s.text)} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</p>
                  </div>
                </div>
                <span className={cn("mono text-[0.6rem] tracking-wider shrink-0", s.text)}>{s.label}</span>
              </header>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] mono text-muted-foreground">
                <span className="flex items-center gap-1"><SrcIcon className="h-3 w-3" /> {sourceLabel[e.source]}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>
                <span className="text-foreground/70">{e.category}</span>
                <span>{e.timestamp}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="opacity-70">conf</span>
                  <span className="block w-12 h-1 rounded-full bg-muted overflow-hidden">
                    <span className={cn("block h-full", s.bar)} style={{ width: `${Math.round(e.confidence * 100)}%` }} />
                  </span>
                  <span className={s.text}>{Math.round(e.confidence * 100)}%</span>
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-border/60 text-xs">
                <span className="text-[0.6rem] mono uppercase tracking-[0.18em] text-muted-foreground">Recommended action · </span>
                <span className="text-foreground/90">{e.recommendedAction}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
