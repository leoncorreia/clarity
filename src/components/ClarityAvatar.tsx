import type { ClarityMode } from "../state/clarityStateMachine";
import { spatialRealAdapter } from "../adapters/spatialRealAdapter";

interface ClarityAvatarProps {
  mode: ClarityMode;
  urgencyLevel: number;
  gazeTarget: "left" | "center" | "right";
  expression: "calm" | "focused" | "urgent" | "uncertain";
  postureText: string;
}

const modeLabel: Record<ClarityMode, string> = {
  idle: "Idle",
  observing: "Observing",
  listening: "Listening",
  reasoning: "Reasoning",
  speaking: "Speaking",
  interrupted: "Interrupted",
  urgent: "Urgent"
};

export function ClarityAvatar({
  mode,
  urgencyLevel,
  gazeTarget,
  expression,
  postureText
}: ClarityAvatarProps) {
  const renderState = spatialRealAdapter.getRenderState(mode, urgencyLevel, gazeTarget);

  return (
    <section className="panel avatar-panel">
      <header className="panel-header">
        <h2>Clarity Embodied Presence</h2>
        <span className={`mode-pill mode-${mode}`}>{modeLabel[mode]}</span>
      </header>

      <div className={`avatar-shell expression-${expression}`}>
        <div
          className={`avatar-ring ${mode === "speaking" ? "pulse-fast" : "pulse-soft"}`}
          style={{ opacity: renderState.ringIntensity / 100 }}
        />
        <div className="avatar-core">
          <div className={`gaze-marker gaze-${gazeTarget}`}>
            Gaze: {gazeTarget.toUpperCase()}
          </div>
          <div className="face-state">Expression: {expression}</div>
          <div className="posture-state">Posture: {postureText}</div>
          <div className="body-cue">SpatialReal cue: {renderState.bodyCue}</div>
        </div>
      </div>

      <div className="avatar-meta">
        <span>Urgency level: {urgencyLevel}/4</span>
        <span>Full-duplex voice: active</span>
        <span>Interruption policy: immediate yield</span>
      </div>
    </section>
  );
}
