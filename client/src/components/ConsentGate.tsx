import { useState } from "react";

interface ConsentGateProps {
  onAccept: () => void;
  selectedAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
  avatarOptions: Array<{ id: string; name: string; imageSrc: string }>;
}

export function ConsentGate({ onAccept, selectedAvatarId, onSelectAvatar, avatarOptions }: ConsentGateProps) {
  const [checked, setChecked] = useState(false);
  const canStart = checked && Boolean(selectedAvatarId);

  return (
    <div className="fixed inset-0 z-50 bg-[radial-gradient(circle_at_top,#10203f_0%,#040916_45%,#02050f_100%)]">
      <div className="h-full w-full p-6 sm:p-8 flex items-center justify-center">
        <div className="glass w-full max-w-5xl rounded-3xl border border-slate-700/60 p-6 sm:p-8 flex flex-col gap-7">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Crisis Coach</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Choose the coach you want to speak with.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAvatar(option.id)}
              className={`rounded-lg border p-2 text-left ${
                selectedAvatarId === option.id
                  ? "border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/40"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <img src={option.imageSrc} alt={option.name} className="w-full h-52 object-cover rounded-xl" />
              <div className="mt-3 text-base font-medium">{option.name}</div>
            </button>
          ))}
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4 sm:p-5">
            <p className="text-sm text-slate-300 leading-relaxed">
              Camera is used locally for affect detection. Audio is processed by Bodhi for live crisis support. Video
              frames are not persisted. Emergency actions may notify trusted contacts when high-risk intent is detected.
            </p>
            <label className="mt-4 flex gap-2 text-sm items-start">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5"
              />
              I understand and consent to begin this session.
            </label>
            <button
              type="button"
              disabled={!canStart}
              onClick={onAccept}
              className="mt-5 rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-45"
            >
              Enter Crisis Coach
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
