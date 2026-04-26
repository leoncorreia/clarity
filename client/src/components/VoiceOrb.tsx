interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  onInterrupt: () => void;
}

export function VoiceOrb({ isListening, isSpeaking, onInterrupt }: VoiceOrbProps) {
  const className = isSpeaking
    ? "voice-orb pulse-speaking bg-amber-400/30"
    : isListening
      ? "voice-orb pulse-listening bg-blue-500/30"
      : "voice-orb bg-slate-500/25";

  return (
    <button
      type="button"
      onClick={onInterrupt}
      className={`${className} grid place-items-center text-xs text-slate-100`}
      title="Interrupt"
    >
      Interrupt
    </button>
  );
}
