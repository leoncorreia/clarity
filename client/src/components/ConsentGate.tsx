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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/65">
      <div className="glass max-w-3xl w-full rounded-xl p-6">
        <h2 className="text-xl font-semibold">Crisis Coach Consent</h2>
        <p className="mt-2 text-sm text-slate-300">Choose who you want to talk to:</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAvatar(option.id)}
              className={`rounded-lg border p-2 text-left ${
                selectedAvatarId === option.id ? "border-blue-500 bg-blue-900/30" : "border-slate-700 bg-slate-900/50"
              }`}
            >
              <img src={option.imageSrc} alt={option.name} className="w-full h-40 object-cover rounded-md" />
              <div className="mt-2 text-sm font-medium">{option.name}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          Camera is used locally for affect detection. Audio is processed by Bodhi for live crisis support. Video frames are not persisted.
          Emergency actions may notify trusted contacts when high-risk intent is detected.
        </p>
        <label className="mt-5 flex gap-2 text-sm items-start">
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
          className="mt-6 rounded-md px-4 py-2 bg-blue-600 disabled:opacity-45"
        >
          Start session
        </button>
      </div>
    </div>
  );
}
