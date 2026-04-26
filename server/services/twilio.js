import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

const client = sid && token ? twilio(sid, token) : null;

export async function sendSMS(to, body) {
  if (!client || !from) {
    throw new Error("Twilio client not configured.");
  }
  await client.messages.create({ from, to, body });
}

export async function initiateCall(to) {
  if (!client || !from) {
    throw new Error("Twilio client not configured.");
  }
  await client.calls.create({
    to,
    from,
    twiml: `<Response><Say voice=\"alice\">This is Crisis Coach connecting you to immediate support.</Say></Response>`
  });
}
