import { useState } from "react";

interface ConsentGateProps {
  onAccept: () => void;
}

export function ConsentGate({ onAccept }: ConsentGateProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/65">
      <div className="glass max-w-xl w-full rounded-xl p-6">
        <h2 className="text-xl font-semibold">Crisis Coach Consent</h2>
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
          disabled={!checked}
          onClick={onAccept}
          className="mt-6 rounded-md px-4 py-2 bg-blue-600 disabled:opacity-45"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
