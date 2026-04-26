import express from "express";
import { sendSMS, initiateCall, isTwilioConfigured } from "../services/twilio.js";
import { insertActionLog } from "../services/supabase.js";

const emergencyContact = process.env.EMERGENCY_CONTACT_NUMBER;
const therapistContact = process.env.ONCALL_THERAPIST_NUMBER;

export const actionRouter = express.Router();

actionRouter.post("/dispatch", async (req, res) => {
  const { sessionId, transcript, intent, metadata } = req.body ?? {};

  if (!sessionId || !intent?.intent) {
    return res.status(400).json({ error: "Invalid dispatch payload" });
  }

  let message = "No action";
  const twilioEnabled = isTwilioConfigured();

  try {
    switch (intent.intent) {
      case "EMERGENCY_DISPATCH":
        if (emergencyContact) {
          await sendSMS(emergencyContact, `Crisis Coach emergency alert: ${transcript}`);
        }
        await initiateCall("+1988");
        message = twilioEnabled
          ? `Emergency action fired${emergencyContact ? " and SMS sent" : ""}`
          : "Emergency intent logged (Twilio not configured)";
        break;

      case "SAFE_WORD":
        if (emergencyContact) {
          await sendSMS(emergencyContact, "Crisis Coach update: your person says they are currently safe.");
        }
        message = twilioEnabled
          ? "Safe confirmation dispatched"
          : "Safe confirmation logged (Twilio not configured)";
        break;

      case "INGESTION_DISCLOSURE":
        if (emergencyContact) {
          await sendSMS(
            emergencyContact,
            `Crisis Coach ingestion disclosure: ${intent.substance || "unspecified substance"}. Transcript: ${transcript}`
          );
        }
        message = twilioEnabled
          ? "Ingestion disclosure dispatched"
          : "Ingestion disclosure logged (Twilio not configured)";
        break;

      case "THERAPIST_REQUEST":
        if (therapistContact) {
          await sendSMS(therapistContact, `Therapist request from session ${sessionId}: ${transcript}`);
        }
        message = twilioEnabled
          ? "Therapist alert sent"
          : "Therapist request logged (Twilio not configured)";
        break;

      default:
        break;
    }

    await insertActionLog({
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      intent_type: intent.intent,
      transcript,
      outcome: "sent",
      metadata: { ...(metadata ?? {}), twilioConfigured: twilioEnabled }
    });

    return res.status(200).json({ action: intent.intent, message });
  } catch (error) {
    await insertActionLog({
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      intent_type: intent.intent,
      transcript,
      outcome: "failed",
      metadata: { error: error instanceof Error ? error.message : "unknown" }
    });
    return res.status(500).json({ error: "Action dispatch failed" });
  }
});
