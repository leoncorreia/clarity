import { useEffect, useMemo, useRef, useState } from "react";

export interface BodhiAgentState {
  transcript: string;
  agentText: string;
  isSpeaking: boolean;
  isListening: boolean;
  interrupt: () => void;
  sendContextUpdate: (payload: { affectSummary: string; hrElevated: boolean; sessionDurationSeconds: number }) => void;
  error: string;
}

interface UseBodhiAgentArgs {
  enabled: boolean;
  onFinalTranscript: (text: string) => void;
}

const systemPrompt = `You are a compassionate mental health first responder. You are trained in CBT grounding techniques (5-4-3-2-1 sensory), box breathing guidance, and de-escalation. Never dismiss feelings. Never suggest the user is overreacting. If the user expresses suicidal ideation, always validate first, then gently ask if they are safe. Keep responses under 3 sentences unless the user asks for more. You can be interrupted at any time — treat interruption as the user needing to speak, not as rudeness. Your goal is to keep the person present, grounded, and connected until professional help is available.`;

export function useBodhiAgent({ enabled, onFinalTranscript }: UseBodhiAgentArgs): BodhiAgentState {
  const [transcript, setTranscript] = useState("");
  const [agentText, setAgentText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const wsUrl = useMemo(() => import.meta.env.VITE_BODHI_WS_URL as string | undefined, []);
  const apiKey = useMemo(() => import.meta.env.VITE_BODHI_API_KEY as string | undefined, []);

  useEffect(() => {
    if (!enabled) return;
    if (!wsUrl || !apiKey) {
      setError("Missing Bodhi WebSocket credentials.");
      return;
    }

    let cancelled = false;

    const start = async () => {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (cancelled) return;

      mediaRef.current = media;
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });

      const ws = new WebSocket(`${wsUrl}?api_key=${encodeURIComponent(apiKey)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsListening(true);
        ws.send(JSON.stringify({ type: "session_init", prompt: systemPrompt }));

        const source = audioCtxRef.current!.createMediaStreamSource(media);
        const processor = audioCtxRef.current!.createScriptProcessor(2048, 1, 1);
        source.connect(processor);
        processor.connect(audioCtxRef.current!.destination);

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const channel = event.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(channel.length);
          for (let i = 0; i < channel.length; i += 1) {
            pcm[i] = Math.max(-1, Math.min(1, channel[i])) * 32767;
          }
          ws.send(JSON.stringify({ type: "audio_chunk", pcm: btoa(String.fromCharCode(...new Uint8Array(pcm.buffer))) }));
        };
      };

      ws.onmessage = async (event) => {
        const payload = JSON.parse(event.data) as {
          type: string;
          text?: string;
          final?: boolean;
          pcm?: string;
        };

        if (payload.type === "stt_chunk" && payload.text) {
          setTranscript(payload.text);
          if (payload.final) {
            onFinalTranscript(payload.text);
          }
        }

        if (payload.type === "agent_text" && payload.text) {
          setAgentText(payload.text);
        }

        if (payload.type === "tts_chunk" && payload.pcm && audioCtxRef.current) {
          setIsSpeaking(true);
          const bytes = Uint8Array.from(atob(payload.pcm), (char) => char.charCodeAt(0));
          const pcm = new Int16Array(bytes.buffer);
          const float = new Float32Array(pcm.length);
          for (let i = 0; i < pcm.length; i += 1) float[i] = pcm[i] / 32767;

          const buffer = audioCtxRef.current.createBuffer(1, float.length, 24000);
          buffer.copyToChannel(float, 0);
          const node = audioCtxRef.current.createBufferSource();
          node.buffer = buffer;
          node.connect(audioCtxRef.current.destination);
          node.onended = () => {
            playbackNodesRef.current = playbackNodesRef.current.filter((entry) => entry !== node);
            if (playbackNodesRef.current.length === 0) setIsSpeaking(false);
          };
          playbackNodesRef.current.push(node);
          node.start();
        }
      };

      ws.onerror = () => setError("Bodhi socket error.");
    };

    void start();

    return () => {
      cancelled = true;
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      playbackNodesRef.current.forEach((node) => node.stop());
      playbackNodesRef.current = [];
      wsRef.current?.close();
      void audioCtxRef.current?.close();
      setIsListening(false);
      setIsSpeaking(false);
    };
  }, [apiKey, enabled, onFinalTranscript, wsUrl]);

  const interrupt = () => {
    playbackNodesRef.current.forEach((node) => node.stop());
    playbackNodesRef.current = [];
    setIsSpeaking(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
  };

  const sendContextUpdate = (payload: { affectSummary: string; hrElevated: boolean; sessionDurationSeconds: number }) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "context_update", ...payload }));
  };

  return {
    transcript,
    agentText,
    isSpeaking,
    isListening,
    interrupt,
    sendContextUpdate,
    error
  };
}
