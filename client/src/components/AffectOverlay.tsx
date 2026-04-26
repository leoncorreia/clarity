import type { AffectScores } from "../hooks/useAffectStream";

interface AffectOverlayProps {
  visible: boolean;
  scores: AffectScores;
  dominantEmotion: string;
}

export function AffectOverlay({ visible, scores, dominantEmotion }: AffectOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute top-4 left-4 z-20 glass rounded-lg p-3 text-xs w-72">
      <div className="font-semibold">Affect Debug</div>
      <div className="mt-1 text-cyan-300">Dominant: {dominantEmotion || "n/a"}</div>
      <pre className="mt-2 whitespace-pre-wrap text-slate-300">{JSON.stringify(scores, null, 2)}</pre>
    </div>
  );
}
