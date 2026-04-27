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
    <div className="fixed inset-0 z-50 bg-[#ecf3f5] text-slate-900 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-base">♡</div>
            <div className="font-medium text-slate-800">Crisis Coach</div>
          </div>
          <div className="hidden sm:block">End-to-end encrypted • Anonymous</div>
        </div>

        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Therapists online now
          </div>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight leading-tight text-slate-900">
            A calm voice, <span className="text-teal-600">whenever you need one.</span>
          </h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Choose a therapist below and start a private voice and video session in under a minute.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAvatar(option.id)}
              className={`rounded-3xl border p-4 bg-white text-left shadow-sm transition ${
                selectedAvatarId === option.id
                  ? "border-teal-500 ring-2 ring-teal-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="w-full h-48 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center">
                <img
                  src={option.imageSrc}
                  alt={option.name}
                  className="w-full h-full object-contain object-center"
                />
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Therapist</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{option.name}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600 leading-relaxed">
            Camera is used locally for affect detection. Audio is processed by Bodhi for live crisis support. Video
            frames are not persisted. Emergency actions may notify trusted contacts when high-risk intent is detected.
          </p>
          <label className="mt-4 flex gap-2 text-sm items-start text-slate-700">
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
            className="mt-5 rounded-xl px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Start session
          </button>
        </div>
      </div>
    </div>
  );
}
