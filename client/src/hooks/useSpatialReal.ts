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

export function useSpatialReal(selectedAvatarId?: string) {
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState("");

  const avatarViewRef = useRef<AvatarView | null>(null);
  const connectingRef = useRef(false);
  const lastVisemeAtRef = useRef(0);

  const config = useMemo(
    () => ({
      appId: import.meta.env.VITE_SPATIALREAL_APP_ID as string | undefined,
      avatarId: selectedAvatarId || (import.meta.env.VITE_SPATIALREAL_AVATAR_ID as string | undefined),
      sessionToken: import.meta.env.VITE_SPATIALREAL_SESSION_TOKEN as string | undefined
    }),
    [selectedAvatarId]
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
            sampleRate: 24000
          }
        });
      }

      AvatarSDK.setSessionToken(config.sessionToken);

      const selectedAvatarId = config.avatarId;
      const currentAvatarId = target.dataset.avatarId;
      if (avatarViewRef.current && currentAvatarId && currentAvatarId !== selectedAvatarId) {
        avatarViewRef.current.controller.close();
        avatarViewRef.current.dispose();
        avatarViewRef.current = null;
      }

      if (!avatarViewRef.current) {
        const avatar = await AvatarManager.shared.load(selectedAvatarId);
        console.log("Avatar keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(avatar)));
        avatarViewRef.current = new AvatarView(avatar, target);
        target.dataset.avatarId = selectedAvatarId;
      }

      const view = avatarViewRef.current;
      const controller = view.controller as unknown as {
        onConnectionState?: (state: string) => void;
        onConversationState?: (state: string) => void;
        initializeAudioContext: () => Promise<void>;
        start: () => Promise<void>;
        setVolume?: (value: number) => void;
      };
      controller.onConnectionState = (state: string) => {
        setAvatarReady(state === "connected");
      };
      controller.onConversationState = (state: string) => {
        controller.setVolume?.(0);
        console.log("SR state:", state);
      };

      await controller.initializeAudioContext();
      await controller.start();
      controller.setVolume?.(0);
      console.log("SpatialReal controller keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(view.controller)));
      console.log("SpatialReal controller own:", Object.keys(view.controller));

      setAvatarReady(true);
      setError("");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Avatar connection failed.");
    } finally {
      connectingRef.current = false;
    }
  }, [avatarReady, config.appId, config.avatarId, config.sessionToken]);

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

  const syncLips = useCallback(async (_text: string) => {
    // Intentionally disabled until we confirm real SDK methods from runtime introspection.
  }, []);

  const driveAudio = useCallback((pcmChunk: ArrayBuffer) => {
    const view = avatarViewRef.current;
    if (!view || pcmChunk.byteLength === 0) return;
    // Intentionally disabled until we confirm real SDK methods from runtime introspection.
    lastVisemeAtRef.current = Date.now();
  }, []);

  const disconnect = useCallback(() => {
    avatarViewRef.current?.controller.close();
    avatarViewRef.current?.dispose();
    avatarViewRef.current = null;
    connectingRef.current = false;
    setAvatarReady(false);
  }, []);

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    const view = avatarViewRef.current;
    if (!view || buffer.byteLength === 0) return;
    (view.controller as unknown as { send?: (audioData: ArrayBuffer, end: boolean) => string }).send?.(buffer, false);
  }, []);

  const endAudio = useCallback(() => {
    const view = avatarViewRef.current;
    if (!view) return;
    (view.controller as unknown as { send?: (audioData: ArrayBuffer, end: boolean) => string }).send?.(new ArrayBuffer(0), true);
  }, []);

  return { connect, setExpression, syncLips, driveAudio, sendAudio, endAudio, disconnect, avatarReady, error };
}
