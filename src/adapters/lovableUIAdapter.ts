export const lovableUIAdapter = {
  getTone(urgencyLevel: number): "calm" | "directive" {
    return urgencyLevel >= 3 ? "directive" : "calm";
  },

  heroTagline:
    "Embodied multimodal intelligence for time-critical decisions where typing fails."
};
