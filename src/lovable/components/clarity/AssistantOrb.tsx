import { cn } from "../../lib/utils";

export type AssistantState = "listening" | "thinking" | "speaking" | "interrupted" | "urgent";

const stateConfig: Record<AssistantState, { label: string; sub: string; color: string; ring: string }> = {
  listening: { label: "Listening", sub: "Capturing audio", color: "var(--primary)", ring: "oklch(0.78 0.16 215 / 0.5)" },
  thinking: { label: "Analyzing scene", sub: "Multi-modal reasoning", color: "var(--primary)", ring: "oklch(0.65 0.18 285 / 0.5)" },
  speaking: { label: "Responding", sub: "Voice output active", color: "var(--success)", ring: "oklch(0.78 0.18 155 / 0.5)" },
  interrupted: { label: "Interrupted", sub: "Yielding to operator", color: "var(--warning)", ring: "oklch(0.82 0.17 78 / 0.5)" },
  urgent: { label: "Priority override", sub: "Critical event detected", color: "var(--critical)", ring: "oklch(0.68 0.24 22 / 0.6)" },
};

export function AssistantOrb({ state }: { state: AssistantState }) {
  const cfg = stateConfig[state];

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 py-8">
      {/* Concentric rings */}
      <div className="relative flex h-72 w-72 items-center justify-center">
        {/* Pulse rings */}
        {(state === "listening" || state === "urgent") && (
          <>
            <span
              className="absolute inset-0 rounded-full animate-pulse-ring"
              style={{ background: `radial-gradient(circle, ${cfg.ring}, transparent 60%)` }}
            />
            <span
              className="absolute inset-0 rounded-full animate-pulse-ring"
              style={{ background: `radial-gradient(circle, ${cfg.ring}, transparent 60%)`, animationDelay: "0.7s" }}
            />
          </>
        )}

        {/* Outer ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border",
            state === "thinking" && "animate-orb-think border-dashed",
            state === "urgent" && "animate-urgent-flash",
          )}
          style={{ borderColor: cfg.ring }}
        />
        <div
          className="absolute inset-6 rounded-full border opacity-60"
          style={{ borderColor: cfg.ring }}
        />

        {/* Core orb */}
        <div
          className={cn(
            "relative h-40 w-40 rounded-full",
            (state === "listening" || state === "speaking") && "animate-orb-breathe",
          )}
          style={{
            background: `radial-gradient(circle at 35% 30%, ${cfg.color}, oklch(0.22 0.02 240) 75%)`,
            boxShadow: `0 0 60px ${cfg.ring}, inset 0 0 40px oklch(0 0 0 / 0.4)`,
          }}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="scanline absolute inset-0" />
          </div>

          {/* Speaking waveform */}
          {state === "speaking" && (
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className="block w-1 rounded-full bg-background/80 animate-waveform"
                  style={{ height: "32px", animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status block */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full animate-blink-dot"
            style={{ background: cfg.color }}
          />
          Clarity · Status
        </div>
        <h2
          key={cfg.label}
          className="mt-2 text-3xl font-semibold tracking-tight animate-ticker"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground mono">{cfg.sub}</p>
      </div>

      {/* Frequency strip */}
      <div className="mt-8 flex h-10 w-full max-w-md items-end justify-between gap-[3px]">
        {Array.from({ length: 48 }).map((_, i) => {
          const active = state === "speaking" || state === "listening";
          const h = active ? 20 + Math.abs(Math.sin(i * 0.6)) * 80 : 12;
          return (
            <span
              key={i}
              className="block w-full rounded-sm transition-all duration-300"
              style={{
                height: `${h}%`,
                background: cfg.color,
                opacity: active ? 0.4 + (i % 5) * 0.1 : 0.15,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
