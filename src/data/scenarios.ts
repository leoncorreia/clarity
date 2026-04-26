import type { SceneEvent } from "../state/clarityStateMachine";

export const baseSceneEvents: SceneEvent[] = [
  {
    id: "patient-1",
    label: "Unconscious patient",
    type: "patient",
    zone: "center",
    severity: "critical"
  },
  {
    id: "airway-risk",
    label: "Blocked airway risk",
    type: "risk",
    zone: "center",
    severity: "high"
  },
  {
    id: "bleeding-1",
    label: "Bleeding from lower leg",
    type: "risk",
    zone: "right",
    severity: "high"
  },
  {
    id: "crowd-noise",
    label: "Crowd noise interference",
    type: "noise",
    zone: "left",
    severity: "medium"
  },
  {
    id: "hazard-zone",
    label: "Unstable hazard zone",
    type: "hazard",
    zone: "right",
    severity: "high"
  }
];

export const oxygenDropEvent: SceneEvent = {
  id: "monitor-oxy-drop",
  label: "Left monitor shows oxygen dropping",
  type: "monitor",
  zone: "left",
  severity: "critical"
};

export const openingObservation =
  "Unconscious patient center-frame, airway obstruction risk, active leg bleed, unstable perimeter.";
