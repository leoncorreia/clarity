import express from "express";
import { randomUUID } from "node:crypto";
import { upsertSession, closeSession } from "../services/supabase.js";

export const sessionRouter = express.Router();
const bodhiOrigin = (process.env.BODHI_ORIGIN || "https://bodhiagent.live").replace(/\/$/, "");
const bodhiApiKey = process.env.BODHI_API_KEY;
const bodhiAgentId = process.env.BODHI_AGENT_ID;

sessionRouter.post("/start", async (_req, res) => {
  const sessionId = randomUUID();
  const startedAt = new Date().toISOString();
  await upsertSession({ id: sessionId, started_at: startedAt });
  res.status(200).json({ sessionId, startedAt });
});

sessionRouter.post("/end", async (req, res) => {
  const { sessionId, summaryText } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  await closeSession(sessionId, summaryText ?? "");
  res.status(200).json({ ok: true });
});

sessionRouter.post("/bodhi-ticket", async (_req, res) => {
  if (!bodhiApiKey || !bodhiAgentId) {
    return res.status(400).json({ error: "Bodhi server credentials are not configured." });
  }

  try {
    const response = await fetch(`${bodhiOrigin}/api/mobile/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bodhiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ agentProfile: bodhiAgentId })
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Bodhi session ticket failed (${response.status})` });
    }

    const payload = await response.json();
    if (!payload?.sessionIntentId || !payload?.token) {
      return res.status(502).json({ error: "Invalid Bodhi session ticket response." });
    }

    const wsOrigin = bodhiOrigin.startsWith("https://")
      ? `wss://${bodhiOrigin.slice(8)}`
      : bodhiOrigin.startsWith("http://")
        ? `ws://${bodhiOrigin.slice(7)}`
        : bodhiOrigin;

    return res.status(200).json({
      sessionIntentId: payload.sessionIntentId,
      token: payload.token,
      wsOrigin
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to create Bodhi session ticket."
    });
  }
});

sessionRouter.post("/bodhi-close", async (req, res) => {
  const { sessionId } = req.body ?? {};
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  if (!bodhiApiKey) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    await fetch(`${bodhiOrigin}/api/mobile/sessions/${encodeURIComponent(sessionId)}/close`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bodhiApiKey}`,
        "Content-Type": "application/json"
      }
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true, skipped: true });
  }
});
