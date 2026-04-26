import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const clampUrgency = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.min(4, Math.round(value)));
};

const mockDecision = (userInput, sceneContext, urgencyLevel) => {
  const lowerInput = userInput.toLowerCase();
  const lowerContext = sceneContext.toLowerCase();

  if (lowerInput.includes("bleeding") || lowerContext.includes("bleeding")) {
    return {
      priority: "critical",
      action: "Control bleeding immediately",
      response:
        "Understood. Control the bleeding now. Apply direct pressure while maintaining airway awareness.",
      confidence: 0.98
    };
  }

  if (lowerInput.includes("oxygen") || lowerContext.includes("oxygen dropping")) {
    return {
      priority: "high",
      action: "Recheck airway and assist breathing",
      response:
        "The left monitor shows oxygen dropping. Recheck airway and prepare assisted breathing.",
      confidence: 0.96
    };
  }

  if (urgencyLevel >= 4) {
    return {
      priority: "critical",
      action: "Airway and hemorrhage control",
      response: "Airway first. Pressure on bleed now. Prepare assisted breathing.",
      confidence: 0.97
    };
  }

  return {
    priority: urgencyLevel >= 3 ? "high" : "medium",
    action: "Perform initial triage",
    response: "Open airway, check pulse, then control bleeding with direct pressure.",
    confidence: 0.95
  };
};

app.post("/decision", (req, res) => {
  const body = req.body ?? {};

  const userInput = typeof body.user_input === "string" ? body.user_input : "";
  const sceneContext = typeof body.scene_context === "string" ? body.scene_context : "";
  const urgencyLevel = clampUrgency(body.urgency_level);

  const decision = mockDecision(userInput, sceneContext, urgencyLevel);
  res.status(200).json(decision);
});

app.post("/bodhi/session", async (_req, res) => {
  const apiKey = process.env.BODHI_API_KEY;

  if (!apiKey) {
    res.status(200).json({
      status: "mock",
      message: "BODHI_API_KEY not set; returning mock session status."
    });
    return;
  }

  try {
    const response = await fetch("https://api.bodhiagent.live/api/mobile/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      }
    });

    const textPayload = await response.text();
    let jsonPayload = { raw: textPayload };

    try {
      jsonPayload = JSON.parse(textPayload);
    } catch {
      // Keep raw payload when upstream response is not JSON.
    }

    res.status(response.status).json({
      status: response.ok ? "ok" : "error",
      upstreamStatus: response.status,
      data: jsonPayload
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(502).json({ status: "error", message });
  }
});

app.listen(port, () => {
  console.log(`Clarity backend listening on port ${port}`);
});
