import { useMemo, useState } from "react";

interface SpatialAvatarApi {
  mount: (target: HTMLElement, options: { apiKey: string; avatarId: string }) => Promise<void>;
  setExpression: (payload: Record<string, number | string | boolean>) => void;
  syncLips: (text: string) => void;
  destroy: () => void;
}

interface SpatialWindow {
  SpatialReal?: {
    createSession: () => SpatialAvatarApi;
  };
}

export function useSpatialReal() {
  const [avatarReady, setAvatarReady] = useState(false);
  const [error, setError] = useState("");

  const config = useMemo(
    () => ({
      apiKey: import.meta.env.VITE_SPATIALREAL_API_KEY as string | undefined,
      avatarId: import.meta.env.VITE_SPATIALREAL_AVATAR_ID as string | undefined
    }),
    []
  );

  const sessionRef = useState<SpatialAvatarApi | null>(null)[0];

  const connect = async (target: HTMLElement) => {
    if (!config.apiKey || !config.avatarId) {
      setError("Missing SpatialReal credentials.");
      return;
    }

    const spatial = (window as unknown as SpatialWindow).SpatialReal;
    if (!spatial?.createSession) {
      setError("SpatialReal SDK not loaded on window.");
      return;
    }

    try {
      const nextSession = spatial.createSession();
      await nextSession.mount(target, {
        apiKey: config.apiKey,
        avatarId: config.avatarId
      });
      (sessionRef as unknown as { current?: SpatialAvatarApi }).current = nextSession;
      setAvatarReady(true);
      setError("");
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Avatar connection failed.");
    }
  };

  const setExpression = (payload: Record<string, number | string | boolean>) => {
    (sessionRef as unknown as { current?: SpatialAvatarApi }).current?.setExpression(payload);
  };

  const syncLips = (text: string) => {
    (sessionRef as unknown as { current?: SpatialAvatarApi }).current?.syncLips(text);
  };

  const disconnect = () => {
    (sessionRef as unknown as { current?: SpatialAvatarApi }).current?.destroy();
    (sessionRef as unknown as { current?: SpatialAvatarApi }).current = undefined;
    setAvatarReady(false);
  };

  return { connect, setExpression, syncLips, disconnect, avatarReady, error };
}
