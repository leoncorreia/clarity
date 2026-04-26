import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvatarCanvas } from "./components/AvatarCanvas";
import { VoiceOrb } from "./components/VoiceOrb";
import { ConsentGate } from "./components/ConsentGate";
import { AffectOverlay } from "./components/AffectOverlay";
import { ActionToast, type ActionToastItem } from "./components/ActionToast";
import { useAffectStream } from "./hooks/useAffectStream";
import { useSpatialReal } from "./hooks/useSpatialReal";
import { useBodhiAgent } from "./hooks/useBodhiAgent";
import { useBiometrics } from "./hooks/useBiometrics";
import { parseIntent } from "./lib/intentParser";
import { dispatchAction } from "./lib/actionDispatcher";
import { endSession, logAffectBatch, startSession } from "./lib/sessionStore";

function App() {
  const [consentGranted, setConsentGranted] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [devHud, setDevHud] = useState(false);
  const [toasts, setToasts] = useState<ActionToastItem[]>([]);
  const [error, setError] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [inputMode, setInputMode] = useState<"mic" | "text">("mic");
  const mountRef = useRef<HTMLDivElement | null>(null);

  const { hrBpm, connect: connectBiometrics } = useBiometrics();

  const { dominantEmotion, scores, emotionHistory } = useAffectStream({
    enabled: consentGranted && Boolean(sessionId),
    sessionId,
    onBatch: async (batch) => {
      if (!sessionId) return;
      await logAffectBatch(sessionId, batch);
    }
  });

  const { connect, setExpression, syncLips, avatarReady, error: avatarError } = useSpatialReal();

  const distressSustained = useMemo(() => {
    const cutoff = Date.now() - 30000;
    const recent = emotionHistory.filter((item) => item.ts >= cutoff);
    if (recent.length === 0) return false;
    const distress = recent.filter((item) =>
      item.emotion.toLowerCase().includes("fear") || item.emotion.toLowerCase().includes("distress")
    );
    const avg = distress.reduce((sum, item) => sum + item.score, 0) / Math.max(1, distress.length);
    return avg > 0.7;
  }, [emotionHistory]);

  const addToast = (title: string, detail: string) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), title, detail }]);
  };

  const handleFinalTranscript = useCallback(async (text: string) => {
      const intent = parseIntent(text, distressSustained);
      if (intent.intent === "NONE") return;
      try {
        const result = await dispatchAction({
          sessionId,
          transcript: text,
          intent,
          metadata: {
            dominantEmotion,
            hrBpm
          }
        });
        addToast("Action dispatched", result?.message ?? intent.intent);
      } catch (dispatchError) {
        setError(dispatchError instanceof Error ? dispatchError.message : "Action dispatch failed.");
      }
    }, [distressSustained, dominantEmotion, hrBpm, sessionId]);

  const bodhi = useBodhiAgent({
    enabled: consentGranted && Boolean(sessionId),
    onFinalTranscript: handleFinalTranscript
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "d") {
        setDevHud((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !consentGranted || !sessionId) return;
    void connect(mountRef.current);
    return () => {
      // handled in hook disconnect on unmount
    };
  }, [connect, consentGranted, sessionId]);

  useEffect(() => {
    if (!avatarReady) return;

    const emotion = dominantEmotion.toLowerCase();
    if (emotion.includes("fear") || emotion.includes("distress")) {
      setExpression({ posture: "lean_forward", brow: "soft", eye_contact: 1 });
    } else if (emotion.includes("anger")) {
      setExpression({ gesture: "open_hands", blink_speed: 0.5 });
    } else {
      setExpression({ posture: "warm_default", eye_contact: 0.75 });
    }

    if (hrBpm && hrBpm > 100) {
      setExpression({ voice_mode: "lower", gesture: "hand_on_chest" });
    }
  }, [avatarReady, dominantEmotion, hrBpm, setExpression]);

  useEffect(() => {
    if (!bodhi.agentText) return;
    syncLips(bodhi.agentText);
  }, [bodhi.agentText, syncLips]);

  useEffect(() => {
    if (!sessionStartedAt) return;
    const timerId = window.setInterval(() => {
      const duration = Math.floor((Date.now() - sessionStartedAt) / 1000);
      bodhi.sendContextUpdate({
        affectSummary: dominantEmotion,
        hrElevated: Boolean(hrBpm && hrBpm > 100),
        sessionDurationSeconds: duration
      });
    }, 5000);

    return () => window.clearInterval(timerId);
  }, [bodhi, dominantEmotion, hrBpm, sessionStartedAt]);

  useEffect(() => {
    bodhi.setMicEnabled(inputMode === "mic");
  }, [inputMode]);

  const beginSession = async () => {
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      permissionStream.getTracks().forEach((track) => track.stop());

      const started = await startSession();
      setSessionId(started.sessionId);
      setSessionStartedAt(Date.now());
      setConsentGranted(true);
      setError("");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to initialize session.");
    }
  };

  const finishSession = async () => {
    if (!sessionId) return;
    try {
      await endSession(sessionId, bodhi.agentText || "Session completed");
      setSessionId("");
      setSessionStartedAt(null);
      setConsentGranted(false);
      addToast("Session ended", "Session summary saved.");
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : "Failed to end session.");
    }
  };

  const showEndButton = sessionStartedAt ? Date.now() - sessionStartedAt > 60000 : false;

  const sendTypedMessage = () => {
    const trimmed = typedInput.trim();
    if (!trimmed) return;
    bodhi.sendText(trimmed);
    setTypedInput("");
  };

  return (
    <div className="app-shell">
      {!consentGranted ? <ConsentGate onAccept={() => void beginSession()} /> : null}

      <AvatarCanvas mountRef={mountRef} error={avatarError} />

      <AffectOverlay visible={devHud} scores={scores} dominantEmotion={dominantEmotion} />
      <ActionToast
        items={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />

      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between gap-3">
        <div className="glass rounded-lg p-3 max-w-xl text-sm">
          <div className="font-semibold">Crisis Coach</div>
          <div className="text-slate-300 mt-1">{bodhi.transcript || "Listening for user speech..."}</div>
          <div className="text-cyan-300 mt-2">Agent: {bodhi.agentText || "Awaiting response..."}</div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("mic")}
              className={`rounded px-2 py-1 text-xs ${inputMode === "mic" ? "bg-blue-700" : "bg-slate-700"}`}
            >
              Mic mode
            </button>
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`rounded px-2 py-1 text-xs ${inputMode === "text" ? "bg-blue-700" : "bg-slate-700"}`}
            >
              Text mode
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendTypedMessage();
              }}
              placeholder="Type message to agent..."
              className="flex-1 rounded bg-slate-900/80 border border-slate-600 px-2 py-1 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={sendTypedMessage}
              className="rounded px-2 py-1 bg-blue-700 text-xs"
            >
              Send
            </button>
          </div>
          {(error || bodhi.error) ? <div className="mt-2 text-red-300">{error || bodhi.error}</div> : null}
        </div>

        <div className="glass rounded-lg p-3 text-xs">
          <div>Emotion: {dominantEmotion || "n/a"}</div>
          <div>HR: {hrBpm ?? "n/a"}</div>
          <button className="mt-2 rounded px-2 py-1 bg-slate-700" onClick={() => void connectBiometrics()}>
            Connect biometrics
          </button>
          {showEndButton ? (
            <button className="ml-2 rounded px-2 py-1 bg-red-700" onClick={() => void finishSession()}>
              End session
            </button>
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <VoiceOrb
          isListening={inputMode === "mic" && bodhi.isListening}
          isSpeaking={bodhi.isSpeaking}
          onInterrupt={bodhi.interrupt}
        />
      </div>
    </div>
  );
}

export default App;
