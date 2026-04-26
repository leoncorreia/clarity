import { useEffect } from "react";

export interface ActionToastItem {
  id: string;
  title: string;
  detail: string;
}

interface ActionToastProps {
  items: ActionToastItem[];
  onDismiss: (id: string) => void;
}

export function ActionToast({ items, onDismiss }: ActionToastProps) {
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((item) =>
      window.setTimeout(() => onDismiss(item.id), 5000)
    );
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [items, onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-30 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="glass rounded-lg px-3 py-2 min-w-72 animate-[fadeIn_200ms_ease-out]">
          <div className="text-sm font-semibold">{item.title}</div>
          <div className="text-xs text-slate-300">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}
