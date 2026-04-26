import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function ensureClient() {
  if (!supabase) {
    throw new Error("Supabase service client is not configured.");
  }
  return supabase;
}

export async function upsertSession(payload) {
  const client = ensureClient();
  const { error } = await client.from("sessions").upsert(payload);
  if (error) throw error;
}

export async function closeSession(sessionId, summaryText) {
  const client = ensureClient();
  const endedAt = new Date().toISOString();
  const started = await client
    .from("sessions")
    .select("started_at")
    .eq("id", sessionId)
    .single();

  const startedAt = started.data?.started_at ? new Date(started.data.started_at).getTime() : Date.now();
  const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));

  const { error } = await client
    .from("sessions")
    .update({ ended_at: endedAt, duration_seconds: durationSeconds, summary_text: summaryText })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function insertAffectBatch(sessionId, batch) {
  const client = ensureClient();
  const records = batch.map((item) => ({
    session_id: sessionId,
    timestamp: item.timestamp,
    dominant_emotion: item.dominantEmotion,
    scores: item.scores
  }));
  const { error } = await client.from("affect_log").insert(records);
  if (error) throw error;
}

export async function insertActionLog(record) {
  const client = ensureClient();
  const { error } = await client.from("action_log").insert(record);
  if (error) throw error;
}
