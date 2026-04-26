import { useCallback, useMemo, useRef, useState } from "react";
import {
  AvatarManager,
  AvatarSDK,
  AvatarView,
  DrivingServiceMode,
  Environment,
  LogLevel
} from "@spatialwalk/avatarkit";

interface ExpressionPayload {
  [key: string]: number | string | boolean;
}

export function useSpatialReal() {
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState("");

  const avatarViewRef = useRef<AvatarView | null>(null);
  const connectingRef = useRef(false);
  const endChunkTimerRef = useRef<number | null>(null);
  const lastChunkRef = useRef<ArrayBuffer | null>(null);

  const config = useMemo(
    () => ({
      appId: import.meta.env.VITE_SPATIALREAL_APP_ID as string | undefined,
      avatarId: import.meta.env.VITE_SPATIALREAL_AVATAR_ID as string | undefined,
      sessionToken: import.meta.env.VITE_SPATIALREAL_SESSION_TOKEN as string | undefined,
      audioSampleRate: Number(import.meta.env.VITE_BODHI_TTS_SAMPLE_RATE || "16000")
    }),
    []
  );

  const connect = useCallback(async (target: HTMLElement) => {
    if (!config.appId || !config.avatarId || !config.sessionToken) {
      setError("Missing SpatialReal app ID, avatar ID, or session token.");
      return;
    }
    if (connectingRef.current || avatarReady) {
      return;
    }

    try {
      connectingRef.current = true;
      if (!AvatarSDK.isInitialized) {
        await AvatarSDK.initialize(config.appId, {
          environment: Environment.intl,
          drivingServiceMode: DrivingServiceMode.sdk,
          logLevel: LogLevel.warning,
          audioFormat: {
            channelCount: 1,
            sampleRate: config.audioSampleRate
          }
        });
      }

      AvatarSDK.setSessionToken(config.sessionToken);

      if (!avatarViewRef.current) {
        const avatar = await AvatarManager.shared.load(config.avatarId);
        avatarViewRef.current = new AvatarView(avatar, target);
      }

      const view = avatarViewRef.current;
      view.controller.onConnectionState = (state: string) => {
        setAvatarReady(state === "connected");
      };

      await view.controller.initializeAudioContext();
      await view.controller.start();
      (view.controller as unknown as { volume?: number }).volume = 0;

      setAvatarReady(true);
      setError("");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Avatar connection failed.");
    } finally {
      connectingRef.current = false;
    }
  }, [avatarReady, config.appId, config.audioSampleRate, config.avatarId, config.sessionToken]);

  const setExpression = useCallback((payload: ExpressionPayload) => {
    const view = avatarViewRef.current;
    if (!view) return;

    const controller = view.controller as unknown as {
      setExpression?: (value: ExpressionPayload) => void;
      applyExpression?: (value: ExpressionPayload) => void;
    };

    if (controller.setExpression) {
      controller.setExpression(payload);
      return;
    }

    if (controller.applyExpression) {
      controller.applyExpression(payload);
    }
  }, []);

  const syncLips = useCallback(async (text: string) => {
    const view = avatarViewRef.current;
    if (!view || !text.trim()) return;

    const controller = view.controller as unknown as {
      syncLips?: (input: string) => void;
      setTextViseme?: (input: string) => void;
    };

    if (controller.syncLips) {
      controller.syncLips(text);
      return;
    }

    if (controller.setTextViseme) {
      controller.setTextViseme(text);
    }
  }, []);

  const driveAudio = useCallback((pcmChunk: ArrayBuffer) => {
    const view = avatarViewRef.current;
    if (!view || pcmChunk.byteLength === 0) return;

    const controller = view.controller as unknown as {
      send?: (audio: ArrayBuffer, end: boolean) => string | null;
    };
    if (controller.send) {
      lastChunkRef.current = pcmChunk;
      controller.send(pcmChunk, false);
      if (endChunkTimerRef.current !== null) {
        window.clearTimeout(endChunkTimerRef.current);
      }
      endChunkTimerRef.current = window.setTimeout(() => {
        if (lastChunkRef.current) {
          controller.send?.(lastChunkRef.current, true);
          lastChunkRef.current = null;
        }
        endChunkTimerRef.current = null;
      }, 260);
    }

    const pcm = new Int16Array(pcmChunk);
    let sum = 0;
    for (let i = 0; i < pcm.length; i += 1) {
      sum += Math.abs(pcm[i] / 32768);
    }
    const avg = pcm.length > 0 ? sum / pcm.length : 0;
    const mouthAmount = Math.min(1, Math.max(0, (avg - 0.01) * 12));
    setExpression({
      mouth_open: mouthAmount,
      viseme_strength: mouthAmount,
      talking: mouthAmount > 0.02
    });
  }, []);

  const disconnect = useCallback(() => {
    if (endChunkTimerRef.current !== null) {
      window.clearTimeout(endChunkTimerRef.current);
      endChunkTimerRef.current = null;
    }
    lastChunkRef.current = null;
    avatarViewRef.current?.controller.close();
    avatarViewRef.current?.dispose();
    avatarViewRef.current = null;
    connectingRef.current = false;
    setAvatarReady(false);
  }, []);

  return { connect, setExpression, syncLips, driveAudio, disconnect, avatarReady, error };
}
