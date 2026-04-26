import { Globe2, ChevronDown } from "lucide-react";
import { scenarios } from "@/data/scenarios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  scenarioId: string;
  onChange: (id: string) => void;
}

export function ScenarioSelector({ scenarioId, onChange }: Props) {
  const current = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 rounded-md border border-border bg-[oklch(0.22_0.02_240)] px-3 py-1.5 hover:border-primary/40 transition-colors">
          <Globe2 className="h-3.5 w-3.5 text-primary" />
          <div className="text-left leading-tight">
            <div className="mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Scenario</div>
            <div className="text-xs font-medium text-foreground">{current.name}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Load Scenario
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {scenarios.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => onChange(s.id)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium">{s.name}</span>
              <span className="mono text-[0.6rem] text-primary">{s.domain}</span>
            </div>
            <span className="text-[0.7rem] text-muted-foreground">{s.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
