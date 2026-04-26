import { useMemo, useRef, useState } from "react";
import {
  AvatarManager,
  AvatarSDK,
  AvatarView,
  DrivingServiceMode,
  Environment
} from "@spatialwalk/avatarkit";

interface ExpressionPayload {
  [key: string]: number | string | boolean;
}

export function useSpatialReal() {
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState("");

  const avatarViewRef = useRef<AvatarView | null>(null);

  const config = useMemo(
    () => ({
      appId: import.meta.env.VITE_SPATIALREAL_APP_ID as string | undefined,
      avatarId: import.meta.env.VITE_SPATIALREAL_AVATAR_ID as string | undefined,
      sessionToken: import.meta.env.VITE_SPATIALREAL_SESSION_TOKEN as string | undefined
    }),
    []
  );

  const connect = async (target: HTMLElement) => {
    if (!config.appId || !config.avatarId || !config.sessionToken) {
      setError("Missing SpatialReal app ID, avatar ID, or session token.");
      return;
    }

    try {
      if (!AvatarSDK.isInitialized) {
        await AvatarSDK.initialize(config.appId, {
          environment: Environment.intl,
          drivingServiceMode: DrivingServiceMode.sdk
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

      setAvatarReady(true);
      setError("");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Avatar connection failed.");
    }
  };

  const setExpression = (payload: ExpressionPayload) => {
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
  };

  const syncLips = async (text: string) => {
    const view = avatarViewRef.current;
    if (!view || !text.trim()) return;

    const controller = view.controller as unknown as {
      speakText?: (input: string) => Promise<void>;
      syncLips?: (input: string) => void;
    };

    if (controller.speakText) {
      await controller.speakText(text);
      return;
    }

    if (controller.syncLips) {
      controller.syncLips(text);
    }
  };

  const disconnect = () => {
    avatarViewRef.current?.controller.close();
    avatarViewRef.current?.dispose();
    avatarViewRef.current = null;
    setAvatarReady(false);
  };

  return { connect, setExpression, syncLips, disconnect, avatarReady, error };
}
