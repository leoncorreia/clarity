import { useEffect, useMemo, useRef, useState } from "react";

export interface BodhiAgentState {
  transcript: string;
  agentText: string;
  isSpeaking: boolean;
  isListening: boolean;
  micEnabled: boolean;
  interrupt: () => void;
  sendText: (text: string) => void;
  setMicEnabled: (enabled: boolean) => void;
  sendContextUpdate: (payload: { affectSummary: string; hrElevated: boolean; sessionDurationSeconds: number }) => void;
  error: string;
}

interface UseBodhiAgentArgs {
  enabled: boolean;
  onFinalTranscript: (text: string) => void;
  onTtsPcmChunk?: (chunk: ArrayBuffer) => void;
}

interface BodhiSessionTicket {
  sessionIntentId: string;
  token: string;
  wsOrigin: string;
}

interface BodhiSocketMessage {
  type?: string;
  text?: string;
  final?: boolean;
  transcript?: string;
  payload?: { text?: string; final?: boolean };
  sampleRate?: number;
  outputSampleRate?: number;
  audio?: { sampleRate?: number };
  sessionId?: string;
}

const systemPrompt = `You are a compassionate mental health first responder. You are trained in CBT grounding techniques (5-4-3-2-1 sensory), box breathing guidance, and de-escalation. Never dismiss feelings. Never suggest the user is overreacting. If the user expresses suicidal ideation, always validate first, then gently ask if they are safe. Keep responses under 3 sentences unless the user asks for more. You can be interrupted at any time  treat interruption as the user needing to speak, not as rudeness. Your goal is to keep the person present, grounded, and connected until professional help is available.`;

const toWsOrigin = (origin: string): string => {
  const trimmed = origin.replace(/\/$/, "");
  if (trimmed.startsWith("https://")) return `wss://${trimmed.slice(8)}`;
  if (trimmed.startsWith("http://")) return `ws://${trimmed.slice(7)}`;
  return trimmed;
};

const clampFloatToInt16 = (value: number): number => {
  const clamped = Math.max(-1, Math.min(1, value));
  return clamped < 0 ? clamped * 32768 : clamped * 32767;
};

const pcm16ToFloat32 = (buffer: ArrayBuffer): Float32Array => {
  const pcm = new Int16Array(buffer);
  const float = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) {
    float[i] = pcm[i] / 32768;
  }
  return float;
};

export function useBodhiAgent({ enabled, onFinalTranscript, onTtsPcmChunk }: UseBodhiAgentArgs): BodhiAgentState {
  const [transcript, setTranscript] = useState("");
  const [agentText, setAgentText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micEnabled, setMicEnabledState] = useState(true);
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const serverSampleRateRef = useRef<number>(24000);
  const sessionIdRef = useRef<string>("");
  const readyRef = useRef(false);
  const micEnabledRef = useRef(true);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onTtsPcmChunkRef = useRef(onTtsPcmChunk);
  const nextPlaybackTimeRef = useRef(0);

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, ""),
    []
  );

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onTtsPcmChunkRef.current = onTtsPcmChunk;
  }, [onTtsPcmChunk]);

  useEffect(() => {
    if (!enabled) return;
    if (!apiBaseUrl) {
      setError("Missing VITE_API_BASE_URL for Bodhi session bootstrap.");
      return;
    }

    let cancelled = false;

    const teardownAudio = () => {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      mediaRef.current = null;
    };

    const playPcmChunk = (buffer: ArrayBuffer) => {
      if (!audioCtxRef.current) return;
      const sampleRate = serverSampleRateRef.current || 24000;
      const float = pcm16ToFloat32(buffer);
      const audioBuffer = audioCtxRef.current.createBuffer(1, float.length, sampleRate);
      const channelData = new Float32Array(float.length);
      channelData.set(float);
      audioBuffer.copyToChannel(channelData, 0);

      const node = audioCtxRef.current.createBufferSource();
      node.buffer = audioBuffer;
      node.connect(audioCtxRef.current.destination);
      node.onended = () => {
        playbackNodesRef.current = playbackNodesRef.current.filter((entry) => entry !== node);
        if (playbackNodesRef.current.length === 0) setIsSpeaking(false);
      };
      playbackNodesRef.current.push(node);
      setIsSpeaking(true);
      const now = audioCtxRef.current.currentTime;
      if (nextPlaybackTimeRef.current < now) {
        nextPlaybackTimeRef.current = now;
      }
      node.start(nextPlaybackTimeRef.current);
      nextPlaybackTimeRef.current += audioBuffer.duration;

      onTtsPcmChunkRef.current?.(buffer);
    };

    const startMicStreaming = async () => {
      if (!audioCtxRef.current || !mediaRef.current || !wsRef.current || processorRef.current) return;

      const source = audioCtxRef.current.createMediaStreamSource(mediaRef.current);
      const processor = audioCtxRef.current.createScriptProcessor(2048, 1, 1);
      source.connect(processor);
      processor.connect(audioCtxRef.current.destination);

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current || !micEnabledRef.current) return;

        const channel = event.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(channel.length);
        for (let i = 0; i < channel.length; i += 1) {
          pcm[i] = clampFloatToInt16(channel[i]);
        }
        ws.send(pcm.buffer);
      };

      sourceRef.current = source;
      processorRef.current = processor;
      setIsListening(micEnabledRef.current);
    };

    const handleJsonMessage = async (message: BodhiSocketMessage) => {
      const type = message.type?.toLowerCase() ?? "";

      if (type === "session.config" || type === "session_config") {
        const sampleRateCandidate =
          message.sampleRate ??
          message.outputSampleRate ??
          message.audio?.sampleRate ??
          (typeof message.payload === "object" && message.payload !== null
            ? (message.payload as { sampleRate?: number; outputSampleRate?: number }).sampleRate ??
              (message.payload as { sampleRate?: number; outputSampleRate?: number }).outputSampleRate
            : undefined);

        if (typeof sampleRateCandidate === "number" && Number.isFinite(sampleRateCandidate)) {
          serverSampleRateRef.current = sampleRateCandidate;
        } else {
          serverSampleRateRef.current = 16000;
        }
        return;
      }

      if (type === "session.ready" || type === "session_ready") {
        readyRef.current = true;
        if (message.sessionId) {
          sessionIdRef.current = message.sessionId;
        }
        await startMicStreaming();
        return;
      }

      if (type === "session.error" || type === "error") {
        setError(message.text || "Bodhi session error.");
        return;
      }

      if ((type.includes("transcript") || type.includes("stt")) && (message.text || message.transcript || message.payload?.text)) {
        const text = message.text || message.transcript || message.payload?.text || "";
        const final = Boolean(message.final || message.payload?.final);
        setTranscript(text);
        if (final) {
          onFinalTranscriptRef.current(text);
        }
        return;
      }

      if ((type.includes("agent") || type.includes("response")) && (message.text || message.payload?.text)) {
        setAgentText(message.text || message.payload?.text || "");
      }
    };

    const createSessionTicket = async (): Promise<BodhiSessionTicket> => {
      const response = await fetch(`${apiBaseUrl}/session/bodhi-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt })
      });

      if (!response.ok) {
        throw new Error(`Failed to create Bodhi session (${response.status}).`);
      }

      const payload = (await response.json()) as Partial<BodhiSessionTicket>;
      if (!payload.sessionIntentId || !payload.token || !payload.wsOrigin) {
        throw new Error("Invalid Bodhi session ticket response.");
      }

      return {
        sessionIntentId: payload.sessionIntentId,
        token: payload.token,
        wsOrigin: payload.wsOrigin
      };
    };

    const closeRemoteSession = async () => {
      if (!sessionIdRef.current) return;
      try {
        await fetch(`${apiBaseUrl}/session/bodhi-close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current })
        });
      } catch {
        // Non-fatal best effort close.
      }
    };

    const start = async () => {
      try {
        mediaRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) return;

        audioCtxRef.current = new AudioContext({ sampleRate: 24000 });

        const ticket = await createSessionTicket();
        if (cancelled) return;

        const socketUrl = `${toWsOrigin(ticket.wsOrigin)}/ws/mobile?sessionIntentId=${encodeURIComponent(ticket.sessionIntentId)}&token=${encodeURIComponent(ticket.token)}`;
        const ws = new WebSocket(socketUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          setError("");
        };

        ws.onmessage = async (event) => {
          if (typeof event.data === "string") {
            try {
              const parsed = JSON.parse(event.data) as BodhiSocketMessage;
              await handleJsonMessage(parsed);
            } catch {
              // Ignore unparsable text frames.
            }
            return;
          }

          if (event.data instanceof ArrayBuffer) {
            playPcmChunk(event.data);
            return;
          }

          if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            playPcmChunk(arrayBuffer);
          }
        };

        ws.onerror = () => setError("Bodhi socket error.");
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Failed to initialize Bodhi agent.");
      }
    };

    void start();

    return () => {
      cancelled = true;
      readyRef.current = false;
      nextPlaybackTimeRef.current = 0;
      setIsListening(false);
      setIsSpeaking(false);

      teardownAudio();

      playbackNodesRef.current.forEach((node) => node.stop());
      playbackNodesRef.current = [];
      wsRef.current?.close();
      wsRef.current = null;

      void audioCtxRef.current?.close();
      audioCtxRef.current = null;

      void closeRemoteSession();
      sessionIdRef.current = "";
    };
  }, [apiBaseUrl, enabled]);

  const interrupt = () => {
    playbackNodesRef.current.forEach((node) => node.stop());
    playbackNodesRef.current = [];
    nextPlaybackTimeRef.current = audioCtxRef.current?.currentTime ?? 0;
    setIsSpeaking(false);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "CANCEL" }));
    }
  };

  const sendContextUpdate = (payload: { affectSummary: string; hrElevated: boolean; sessionDurationSeconds: number }) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !readyRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "context_update", ...payload }));
  };

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || wsRef.current?.readyState !== WebSocket.OPEN || !readyRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "text_input", text: trimmed }));
    setTranscript(trimmed);
  };

  const setMicEnabled = (enabledValue: boolean) => {
    micEnabledRef.current = enabledValue;
    setMicEnabledState(enabledValue);
    setIsListening(enabledValue && readyRef.current);
  };

  return {
    transcript,
    agentText,
    isSpeaking,
    isListening,
    micEnabled,
    interrupt,
    sendText,
    setMicEnabled,
    sendContextUpdate,
    error
  };
}
