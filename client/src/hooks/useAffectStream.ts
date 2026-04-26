import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AffectScores = Record<string, number>;

interface HumeMessage {
  emotions?: Array<{ name: string; score: number }>;
}

interface UseAffectStreamArgs {
  enabled: boolean;
  sessionId: string;
  onBatch: (batch: Array<{ timestamp: string; dominantEmotion: string; scores: AffectScores }>) => Promise<void>;
}

export function useAffectStream({ enabled, sessionId, onBatch }: UseAffectStreamArgs) {
  const [scores, setScores] = useState<AffectScores>({});
  const [dominantEmotion, setDominantEmotion] = useState<string>("");
  const [emotionHistory, setEmotionHistory] = useState<Array<{ emotion: string; score: number; ts: number }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const batchRef = useRef<Array<{ timestamp: string; dominantEmotion: string; scores: AffectScores }>>([]);

  const humeUrl = useMemo(() => {
    const key = import.meta.env.VITE_HUME_API_KEY as string | undefined;
    if (!key) return "";
    return `wss://api.hume.ai/v0/stream/models?api_key=${key}&models=language,face`;
  }, []);

  const pushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;
    const payload = [...batchRef.current];
    batchRef.current = [];
    await onBatch(payload);
  }, [onBatch]);

  useEffect(() => {
    if (!enabled || !humeUrl) return;

    let cancelled = false;

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (cancelled) return;
      mediaStreamRef.current = stream;

      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      const ws = new WebSocket(humeUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const parsed = JSON.parse(event.data) as HumeMessage;
        const emotions = parsed.emotions ?? [];
        if (emotions.length === 0) return;

        const sorted = [...emotions].sort((a, b) => b.score - a.score);
        const nextScores = sorted.slice(0, 6).reduce<AffectScores>((acc, emotion) => {
          acc[emotion.name] = emotion.score;
          return acc;
        }, {});

        const top = sorted[0];
        setScores(nextScores);
        setDominantEmotion(top.name);
        setEmotionHistory((prev) => [...prev.slice(-500), { emotion: top.name, score: top.score, ts: Date.now() }]);

        batchRef.current.push({
          timestamp: new Date().toISOString(),
          dominantEmotion: top.name,
          scores: nextScores
        });
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      frameTimerRef.current = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || !video.videoWidth || !video.videoHeight) return;
        canvas.width = 320;
        canvas.height = 180;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        ws.send(JSON.stringify({
          session_id: sessionId,
          image: dataUrl.replace("data:image/jpeg;base64,", "")
        }));
      }, 200);

      const batchTimer = window.setInterval(() => {
        void pushBatch();
      }, 5000);

      return () => window.clearInterval(batchTimer);
    };

    const cleanupPromise = start();

    return () => {
      cancelled = true;
      void cleanupPromise.then((clearBatch) => clearBatch?.());
      if (frameTimerRef.current) window.clearInterval(frameTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      wsRef.current?.close();
      void pushBatch();
    };
  }, [enabled, humeUrl, pushBatch, sessionId]);

  return { dominantEmotion, scores, emotionHistory };
}
