import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
let warnedMissingSupabase = false;

function ensureClient() {
  if (!supabase) {
    if (!warnedMissingSupabase) {
      warnedMissingSupabase = true;
      console.warn("Supabase not configured; running without persistence.");
    }
    return null;
  }
  return supabase;
}

export async function upsertSession(payload) {
  const client = ensureClient();
  if (!client) return;
  const { error } = await client.from("sessions").upsert(payload);
  if (error) {
    console.warn("Supabase upsertSession failed:", error.message);
  }
}

export async function closeSession(sessionId, summaryText) {
  const client = ensureClient();
  if (!client) return;
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

  if (error) {
    console.warn("Supabase closeSession failed:", error.message);
  }
}

export async function insertAffectBatch(sessionId, batch) {
  const client = ensureClient();
  if (!client) return;
  const records = batch.map((item) => ({
    session_id: sessionId,
    timestamp: item.timestamp,
    dominant_emotion: item.dominantEmotion,
    scores: item.scores
  }));
  const { error } = await client.from("affect_log").insert(records);
  if (error) {
    console.warn("Supabase insertAffectBatch failed:", error.message);
  }
}

export async function insertActionLog(record) {
  const client = ensureClient();
  if (!client) return;
  const { error } = await client.from("action_log").insert(record);
  if (error) {
    console.warn("Supabase insertActionLog failed:", error.message);
  }
}
