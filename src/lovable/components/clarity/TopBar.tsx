import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

interface TopBarProps {
  urgent: boolean;
  sector: string;
  protocol: string;
  rightSlot?: ReactNode;
}

export function TopBar({ urgent, sector, protocol, rightSlot }: TopBarProps) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toISOString().split("T")[1].split(".")[0] + "Z");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-border bg-[oklch(0.18_0.02_240_/_0.85)] backdrop-blur-md px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-8 w-8 rounded-md border border-primary/40 flex items-center justify-center bg-primary/10">
          <span className="absolute inset-0 rounded-md border border-primary/30 animate-blink-dot" />
          <span className="mono text-xs font-bold text-primary">CL</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight leading-none">CLARITY <span className="text-muted-foreground font-normal">/ Mission Console</span></h1>
          <p className="mono text-[0.65rem] text-muted-foreground mt-0.5">Embodied AI · {protocol}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {urgent && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-critical/50 bg-critical/10 animate-urgent-flash">
            <ShieldAlert className="h-4 w-4 text-critical" />
            <span className="mono text-xs uppercase tracking-[0.2em] text-critical font-semibold">Priority Override</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-[0.7rem] mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-blink-dot" />
            UPLINK STABLE
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-blink-dot" />
            SCENE LOCK
          </div>
          <div>{sector}</div>
          <div className="text-foreground">{time}</div>
        </div>
        {rightSlot}
      </div>
    </header>
  );
}
