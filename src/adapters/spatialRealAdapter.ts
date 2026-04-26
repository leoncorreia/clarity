import type { ClarityMode } from "../state/clarityStateMachine";

export interface SpatialRenderState {
  ringIntensity: number;
  gazeTarget: "left" | "center" | "right";
  bodyCue: string;
}

export interface SpatialAvatarConfig {
  avatarId: string;
  appId?: string;
  liveEnabled: boolean;
}

const spatialAvatarId =
  (import.meta.env.VITE_SPATIALREAL_AVATAR_ID as string | undefined) ??
  "7662336d-8eda-4dd0-ae39-5119777679ba";
const spatialAppId = import.meta.env.VITE_SPATIALREAL_APP_ID as string | undefined;
const spatialApiKey = import.meta.env.VITE_SPATIALREAL_API_KEY as string | undefined;

export const spatialRealAdapter = {
  getAvatarConfig(): SpatialAvatarConfig {
    return {
      avatarId: spatialAvatarId,
      appId: spatialAppId,
      liveEnabled: Boolean(spatialAppId && spatialApiKey && spatialAvatarId)
    };
  },

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
