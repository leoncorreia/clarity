import express from "express";
import { randomUUID } from "node:crypto";
import { upsertSession, closeSession } from "../services/supabase.js";

export const sessionRouter = express.Router();

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
