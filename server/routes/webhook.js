import express from "express";
import { insertAffectBatch } from "../services/supabase.js";

export const webhookRouter = express.Router();

webhookRouter.post("/hume", async (req, res) => {
  const { sessionId, batch } = req.body ?? {};
  if (!sessionId || !Array.isArray(batch)) {
    return res.status(400).json({ error: "Invalid hume payload" });
  }

  await insertAffectBatch(sessionId, batch);
  return res.status(200).json({ ok: true });
});
