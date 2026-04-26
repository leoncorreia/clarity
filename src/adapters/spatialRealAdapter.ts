import type { ClarityMode } from "../state/clarityStateMachine";

export interface SpatialRenderState {
  ringIntensity: number;
  gazeTarget: "left" | "center" | "right";
  bodyCue: string;
}

export const spatialRealAdapter = {
  getRenderState(mode: ClarityMode, urgencyLevel: number, gazeTarget: "left" | "center" | "right"): SpatialRenderState {
    const ringIntensity = Math.min(100, 30 + urgencyLevel * 18 + (mode === "speaking" ? 10 : 0));
    const bodyCue =
      mode === "listening"
        ? "Micro nod, audio focus"
        : mode === "reasoning"
          ? "Head tilt, planning"
          : mode === "speaking"
            ? "Forward posture, directive"
            : mode === "interrupted"
              ? "Immediate stop, reorient"
              : urgencyLevel >= 4
                ? "Locked, high-focus stance"
                : "Calm neutral posture";

    return { ringIntensity, gazeTarget, bodyCue };
  }
};
