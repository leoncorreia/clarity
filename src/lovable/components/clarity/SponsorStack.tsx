import { Layers } from "lucide-react";

const stack = [
  { name: "SpatialReal", role: "Spatial Awareness", code: "SPT" },
  { name: "Bodhi Agent", role: "Decision Reasoning", code: "BDH" },
  { name: "PhyAgentOS", role: "Physical World Model", code: "PHY" },
  { name: "Lovable", role: "UI / UX Layer", code: "LVB" },
];

export function SponsorStack() {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-primary" />
          System Stack
        </span>
        <span className="mono text-[0.65rem] normal-case tracking-normal text-success">4 / 4 ONLINE</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4">
        {stack.map((s) => (
          <div
            key={s.name}
            className="group relative overflow-hidden rounded-md border border-border bg-[oklch(0.22_0.02_240)] p-3 transition-colors hover:border-primary/40"
          >
            <div className="absolute inset-y-0 left-0 w-0.5 bg-primary/60" />
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[0.6rem] tracking-[0.2em] text-primary">{s.code}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-blink-dot" />
            </div>
            <p className="text-sm font-semibold text-foreground">{s.name}</p>
            <p className="text-[0.7rem] text-muted-foreground mt-0.5">{s.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
