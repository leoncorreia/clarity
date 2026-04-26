import { cn } from "../../lib/utils";
import { Play, Mic, Hand, PlusCircle, AlertOctagon, RotateCcw, type LucideIcon } from "lucide-react";

interface ControlButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "warning" | "critical";
  active?: boolean;
}

function ControlButton({ label, icon: Icon, onClick, variant = "default", active }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 transition-all",
        "bg-[oklch(0.22_0.02_240)] hover:bg-[oklch(0.26_0.025_240)] active:translate-y-px",
        "border-border hover:border-primary/40",
        variant === "primary" && "border-primary/40 hover:border-primary text-primary",
        variant === "warning" && "border-[oklch(0.82_0.17_78_/_0.4)] hover:border-warning text-warning",
        variant === "critical" && "border-[oklch(0.68_0.24_22_/_0.4)] hover:border-critical text-critical",
        active && "ring-1 ring-primary glow-primary",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 -top-px h-px opacity-0 group-hover:opacity-100 transition-opacity",
          variant === "primary" && "bg-primary",
          variant === "warning" && "bg-warning",
          variant === "critical" && "bg-critical",
          variant === "default" && "bg-foreground/30",
        )}
      />
      <Icon className="h-4 w-4" />
      <span className="text-[0.65rem] mono uppercase tracking-[0.12em]">{label}</span>
    </button>
  );
}

interface ControlPanelProps {
  onStart: () => void;
  onTalk: () => void;
  onInterrupt: () => void;
  onAddEvent: () => void;
  onEscalate: () => void;
  onReset: () => void;
  talking: boolean;
}

export function ControlPanel(p: ControlPanelProps) {
  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="panel-header">
        <span>Operator Controls</span>
        <span className="mono text-[0.65rem] normal-case tracking-normal text-muted-foreground">6 actions</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3 lg:grid-cols-6">
        <ControlButton label="Start" icon={Play} onClick={p.onStart} variant="primary" />
        <ControlButton label="Talk" icon={Mic} onClick={p.onTalk} variant="primary" active={p.talking} />
        <ControlButton label="Interrupt" icon={Hand} onClick={p.onInterrupt} variant="warning" />
        <ControlButton label="Add Event" icon={PlusCircle} onClick={p.onAddEvent} />
        <ControlButton label="Escalate" icon={AlertOctagon} onClick={p.onEscalate} variant="critical" />
        <ControlButton label="Reset" icon={RotateCcw} onClick={p.onReset} />
      </div>
    </section>
  );
}
