import WebSocket from "ws";

const humeKey = process.env.VITE_HUME_API_KEY || process.env.HUME_API_KEY;

export function startAffectRelay() {
  if (!humeKey) {
    throw new Error("HUME API key missing for affect worker.");
  }

  const ws = new WebSocket(`wss://api.hume.ai/v0/stream/models?api_key=${encodeURIComponent(humeKey)}&models=face`);
  ws.on("open", () => {
    console.log("Hume relay worker connected.");
  });
  ws.on("message", () => {
    // relay target can be added here for multi-session fanout.
  });
  ws.on("error", (error) => {
    console.error("Hume worker error", error);
  });
}
