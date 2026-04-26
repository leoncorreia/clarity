// Generic Entity Perception data model — domain-agnostic.
// The dashboard renders any scenario that conforms to this schema.

export type Severity = "nominal" | "info" | "warning" | "critical";
export type SignalSource = "vision" | "audio" | "sensor" | "user_input" | "system";

export interface PerceivedEntity {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  location: string;
  confidence: number; // 0-1
  timestamp: string; // ISO or HH:MM:SS
  source: SignalSource;
  recommendedAction: string;
}

export interface TranscriptSeed {
  speaker: "user" | "clarity" | "system";
  text: string;
  time: string;
  urgent?: boolean;
}

export interface ReasoningSeed {
  priority: string;
  nextAction: string;
  confidence: number;
  urgency: "low" | "moderate" | "high" | "critical";
}

export interface Scenario {
  id: string;
  name: string;
  domain: string;
  sector: string;
  protocol: string;
  description: string;
  entities: PerceivedEntity[];
  transcript: TranscriptSeed[];
  reasoning: ReasoningSeed;
  // Optional pool of additional events the operator can ingest.
  additionalEvents?: PerceivedEntity[];
}

const t = (h: number, m: number, s: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

export const scenarios: Scenario[] = [
  {
    id: "emergency-response",
    name: "Emergency Response",
    domain: "Field Medical",
    sector: "SECTOR 04-B",
    protocol: "Field Response Protocol v3.2",
    description: "Pre-hospital trauma scene with single casualty.",
    entities: [
      { id: "er1", title: "Unresponsive person", description: "Adult · supine · no response to stimuli", severity: "critical", category: "Subject", location: "Center frame · 1.4m", confidence: 0.97, timestamp: t(14,22,4), source: "vision", recommendedAction: "Confirm pulse and breathing" },
      { id: "er2", title: "Airway obstruction risk", description: "Tongue position partially blocking airway", severity: "critical", category: "Physiological", location: "Subject · head", confidence: 0.88, timestamp: t(14,22,6), source: "vision", recommendedAction: "Chin-lift, jaw-thrust maneuver" },
      { id: "er3", title: "Arterial bleeding", description: "Active hemorrhage from left thigh", severity: "critical", category: "Physiological", location: "Subject · left leg", confidence: 0.94, timestamp: t(14,22,7), source: "vision", recommendedAction: "Apply tourniquet immediately" },
      { id: "er4", title: "SpO₂ trending down", description: "92% → 87% over 40 seconds", severity: "warning", category: "Vitals", location: "Left monitor", confidence: 0.99, timestamp: t(14,22,12), source: "sensor", recommendedAction: "Prepare bag-valve mask" },
      { id: "er5", title: "Heart rate elevated", description: "128 bpm · trending up", severity: "warning", category: "Vitals", location: "Left monitor", confidence: 0.99, timestamp: t(14,22,12), source: "sensor", recommendedAction: "Continue monitoring" },
      { id: "er6", title: "Scene secured", description: "No environmental hazards detected", severity: "nominal", category: "Environment", location: "Perimeter · 5m", confidence: 0.91, timestamp: t(14,22,1), source: "vision", recommendedAction: "Maintain awareness" },
    ],
    additionalEvents: [
      { id: "er-add1", title: "Secondary subject detected", description: "Additional person at scene periphery", severity: "warning", category: "Subject", location: "Right · 4.2m", confidence: 0.82, timestamp: "", source: "vision", recommendedAction: "Triage and assess" },
      { id: "er-add2", title: "Smoke detected · north exit", description: "Visibility reducing rapidly", severity: "critical", category: "Environment", location: "North · 8m", confidence: 0.9, timestamp: "", source: "vision", recommendedAction: "Initiate evacuation" },
    ],
    transcript: [
      { speaker: "system", text: "Scenario engaged · SECTOR 04-B", time: t(14,22,1) },
      { speaker: "user", text: "Clarity, what am I looking at?", time: t(14,22,8) },
      { speaker: "clarity", text: "Adult, unconscious, with arterial bleeding to the left thigh and partial airway obstruction. Oxygen saturation is dropping. Apply tourniquet first — bleed-out window is shorter than airway window.", time: t(14,22,11) },
      { speaker: "user", text: "Tourniquet on. What's next?", time: t(14,22,34) },
      { speaker: "clarity", text: "Confirmed tourniquet placement. Now reposition the airway. I'm watching SpO₂ for recovery.", time: t(14,22,37) },
    ],
    reasoning: {
      priority: "Hemorrhage control · airway management",
      nextAction: "Reposition airway · monitor SpO₂ trend · prepare bag-valve mask",
      confidence: 92,
      urgency: "high",
    },
  },

  {
    id: "warehouse-safety",
    name: "Warehouse Safety",
    domain: "Logistics",
    sector: "AISLE 12-C",
    protocol: "Warehouse Safety Protocol v1.4",
    description: "Active fulfillment floor with forklift traffic.",
    entities: [
      { id: "w1", title: "Forklift in pedestrian zone", description: "Reach truck operating outside marked lanes", severity: "critical", category: "Vehicle", location: "Aisle 12 · 6m", confidence: 0.93, timestamp: t(9,14,22), source: "vision", recommendedAction: "Halt traffic · redirect operator" },
      { id: "w2", title: "Worker without high-vis", description: "Person in active zone missing PPE", severity: "warning", category: "PPE", location: "Pick station 4", confidence: 0.86, timestamp: t(9,14,18), source: "vision", recommendedAction: "Issue PPE compliance alert" },
      { id: "w3", title: "Pallet stacked above limit", description: "Stack height 3.2m · limit 2.8m", severity: "warning", category: "Inventory", location: "Bay B-07", confidence: 0.91, timestamp: t(9,13,55), source: "vision", recommendedAction: "Schedule re-stack within 30 min" },
      { id: "w4", title: "Spill detected", description: "Liquid pool · approx 0.4m²", severity: "warning", category: "Hazard", location: "Aisle 11 floor", confidence: 0.79, timestamp: t(9,14,2), source: "vision", recommendedAction: "Deploy wet-floor markers" },
      { id: "w5", title: "Loading dock clear", description: "All bays in nominal state", severity: "nominal", category: "Environment", location: "Dock 1-4", confidence: 0.95, timestamp: t(9,14,0), source: "system", recommendedAction: "No action required" },
    ],
    additionalEvents: [
      { id: "w-add1", title: "Smoke alarm pre-signal", description: "Optical sensor near threshold", severity: "warning", category: "Fire", location: "Zone C ceiling", confidence: 0.74, timestamp: "", source: "sensor", recommendedAction: "Inspect and verify" },
    ],
    transcript: [
      { speaker: "system", text: "Shift opened · AISLE 12-C", time: t(9,13,50) },
      { speaker: "clarity", text: "Three concurrent risks detected. Highest priority: forklift operating in pedestrian zone near pick station 4.", time: t(9,14,23) },
      { speaker: "user", text: "Notify the floor lead.", time: t(9,14,40) },
      { speaker: "clarity", text: "Floor lead notified. Suggesting temporary lane closure until operator is redirected.", time: t(9,14,42) },
    ],
    reasoning: {
      priority: "Vehicle-pedestrian separation",
      nextAction: "Halt forklift · enforce PPE compliance · clear spill",
      confidence: 88,
      urgency: "high",
    },
  },

  {
    id: "factory-inspection",
    name: "Factory Inspection",
    domain: "Manufacturing",
    sector: "LINE 03",
    protocol: "Quality & Safety QC-7",
    description: "Automated assembly line under quality audit.",
    entities: [
      { id: "f1", title: "Vibration anomaly · spindle 4", description: "Amplitude 2.3× baseline", severity: "warning", category: "Machinery", location: "Line 03 · CNC bay", confidence: 0.89, timestamp: t(11,2,14), source: "sensor", recommendedAction: "Schedule bearing inspection" },
      { id: "f2", title: "Surface defect detected", description: "Recurrent micro-scratch on output unit 412", severity: "warning", category: "Quality", location: "QC station 2", confidence: 0.84, timestamp: t(11,2,10), source: "vision", recommendedAction: "Pull batch · trace upstream" },
      { id: "f3", title: "Conveyor speed nominal", description: "1.2 m/s · within spec", severity: "nominal", category: "Process", location: "Belt A", confidence: 0.99, timestamp: t(11,2,0), source: "sensor", recommendedAction: "No action required" },
      { id: "f4", title: "Operator at restricted door", description: "Badge swipe required for entry", severity: "info", category: "Access", location: "Door D-3", confidence: 0.92, timestamp: t(11,2,5), source: "vision", recommendedAction: "Verify authorization" },
    ],
    transcript: [
      { speaker: "system", text: "Inspection mode · Line 03", time: t(11,1,55) },
      { speaker: "clarity", text: "Spindle 4 is showing 2.3× baseline vibration. Likely bearing wear. Recommend inspection at next changeover.", time: t(11,2,15) },
    ],
    reasoning: {
      priority: "Equipment health · output quality",
      nextAction: "Mark batch suspect · queue spindle 4 maintenance",
      confidence: 87,
      urgency: "moderate",
    },
  },

  {
    id: "hospital-triage",
    name: "Hospital Triage",
    domain: "Clinical",
    sector: "ED · ZONE A",
    protocol: "Triage Assist v2.1",
    description: "Emergency department waiting area at peak load.",
    entities: [
      { id: "h1", title: "Pediatric patient · respiratory distress", description: "Audible wheeze · accessory muscle use", severity: "critical", category: "Patient", location: "Bay A-2", confidence: 0.93, timestamp: t(20,15,12), source: "audio", recommendedAction: "Escalate to ESI level 2" },
      { id: "h2", title: "Chest pain reported", description: "Adult male · self-reported · 8/10", severity: "warning", category: "Patient", location: "Waiting · row 3", confidence: 0.9, timestamp: t(20,15,4), source: "user_input", recommendedAction: "EKG within 10 minutes" },
      { id: "h3", title: "Wait time threshold breached", description: "Bay A-1 patient waiting 47 min", severity: "warning", category: "Throughput", location: "Bay A-1", confidence: 0.99, timestamp: t(20,14,50), source: "system", recommendedAction: "Reassess vitals" },
      { id: "h4", title: "Hand hygiene compliance", description: "92% over last hour · target 95%", severity: "info", category: "Compliance", location: "Zone A", confidence: 0.99, timestamp: t(20,14,0), source: "sensor", recommendedAction: "Coach next rotation" },
    ],
    transcript: [
      { speaker: "system", text: "Triage assist enabled", time: t(20,15,0) },
      { speaker: "clarity", text: "Pediatric patient in Bay A-2 is showing respiratory distress. Recommending immediate escalation.", time: t(20,15,13) },
    ],
    reasoning: {
      priority: "Pediatric airway · time-critical reassessments",
      nextAction: "Escalate Bay A-2 · order EKG for chest-pain patient",
      confidence: 90,
      urgency: "high",
    },
  },

  {
    id: "construction-site",
    name: "Construction Monitoring",
    domain: "Construction",
    sector: "TOWER · LVL 14",
    protocol: "Site Safety SSP-9",
    description: "High-rise construction · structural and PPE oversight.",
    entities: [
      { id: "c1", title: "Worker near unguarded edge", description: "1.2m from open edge · no harness anchor", severity: "critical", category: "Fall risk", location: "Level 14 · NE corner", confidence: 0.91, timestamp: t(7,40,5), source: "vision", recommendedAction: "Verbal alert · halt activity" },
      { id: "c2", title: "Crane load swing", description: "Load oscillation exceeds 0.6m radius", severity: "warning", category: "Lifting", location: "Tower crane T1", confidence: 0.86, timestamp: t(7,40,1), source: "vision", recommendedAction: "Pause lift · stabilize load" },
      { id: "c3", title: "Hard hat compliance", description: "94% across shift · within spec", severity: "nominal", category: "PPE", location: "All zones", confidence: 0.96, timestamp: t(7,39,0), source: "vision", recommendedAction: "No action required" },
      { id: "c4", title: "Wind speed rising", description: "32 km/h gust · advisory threshold 40", severity: "info", category: "Weather", location: "Anemometer · roof", confidence: 0.99, timestamp: t(7,40,0), source: "sensor", recommendedAction: "Monitor for crane stop criteria" },
    ],
    transcript: [
      { speaker: "system", text: "Site monitoring online", time: t(7,39,55) },
      { speaker: "clarity", text: "Worker is approaching the unguarded edge on the NE corner. Issuing audible alert.", time: t(7,40,6) },
    ],
    reasoning: {
      priority: "Fall prevention · lift stability",
      nextAction: "Re-anchor worker · pause crane lift · monitor wind",
      confidence: 89,
      urgency: "high",
    },
  },

  {
    id: "security-ops",
    name: "Security Operations",
    domain: "Physical Security",
    sector: "PERIMETER · NORTH",
    protocol: "SOC Watch v4",
    description: "After-hours facility monitoring.",
    entities: [
      { id: "s1", title: "Unauthorized entry attempt", description: "Badge denied · door forced 2cm", severity: "critical", category: "Intrusion", location: "Door N-3", confidence: 0.92, timestamp: t(2,11,8), source: "sensor", recommendedAction: "Dispatch officer · lock down zone" },
      { id: "s2", title: "Loitering detected", description: "Subject stationary 4 min near loading dock", severity: "warning", category: "Behavior", location: "Dock 2 · exterior", confidence: 0.84, timestamp: t(2,10,40), source: "vision", recommendedAction: "Verify identity via PA" },
      { id: "s3", title: "Camera 7 offline", description: "No signal for 90s", severity: "warning", category: "Infrastructure", location: "Cam 7 · west fence", confidence: 0.99, timestamp: t(2,10,30), source: "system", recommendedAction: "Switch to backup feed" },
      { id: "s4", title: "Perimeter nominal · south", description: "All sensors green", severity: "nominal", category: "Environment", location: "South fence", confidence: 0.97, timestamp: t(2,11,0), source: "sensor", recommendedAction: "No action required" },
    ],
    transcript: [
      { speaker: "system", text: "Night watch · perimeter active", time: t(2,10,0) },
      { speaker: "clarity", text: "Forced entry signature at Door N-3. Recommending zone lockdown and officer dispatch.", time: t(2,11,9) },
    ],
    reasoning: {
      priority: "Active intrusion containment",
      nextAction: "Lock down north zone · dispatch officer · failover Cam 7",
      confidence: 94,
      urgency: "critical",
    },
  },

  {
    id: "disaster-response",
    name: "Disaster Response",
    domain: "Field Coordination",
    sector: "GRID 22-J",
    protocol: "DR Coordination DRC-2",
    description: "Post-event multi-hazard coordination.",
    entities: [
      { id: "d1", title: "Structural collapse risk", description: "Visible cracking on load-bearing wall", severity: "critical", category: "Structural", location: "Building 4 · west", confidence: 0.86, timestamp: t(16,5,10), source: "vision", recommendedAction: "Evacuate · cordon 20m" },
      { id: "d2", title: "Trapped occupant signal", description: "Tap pattern detected through rubble", severity: "critical", category: "Survivor", location: "Building 4 · NE pile", confidence: 0.78, timestamp: t(16,5,20), source: "audio", recommendedAction: "Deploy SAR team to NE pile" },
      { id: "d3", title: "Gas leak suspected", description: "Sensor reading above ambient baseline", severity: "warning", category: "Hazard", location: "Street level · Bldg 4", confidence: 0.81, timestamp: t(16,5,5), source: "sensor", recommendedAction: "Shut utility · ventilate" },
      { id: "d4", title: "Triage point established", description: "Operational at 16:00", severity: "nominal", category: "Logistics", location: "Plaza · 80m east", confidence: 0.99, timestamp: t(16,0,0), source: "user_input", recommendedAction: "Maintain throughput" },
    ],
    transcript: [
      { speaker: "system", text: "Coordination active · Grid 22-J", time: t(16,4,55) },
      { speaker: "clarity", text: "Survivor signal in NE rubble pile of Building 4. Structural risk on the west face — keep SAR approach from the east.", time: t(16,5,21) },
    ],
    reasoning: {
      priority: "Survivor extraction · structural containment",
      nextAction: "Route SAR via east approach · shut gas utility · cordon west wall",
      confidence: 85,
      urgency: "critical",
    },
  },
];

export const defaultScenarioId = "emergency-response";

export const getScenario = (id: string): Scenario =>
  scenarios.find((s) => s.id === id) ?? scenarios[0];
