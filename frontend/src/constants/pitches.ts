/**
 * Pitch Constants
 *
 * Contains pitch IDs from the database.
 * These IDs correspond to the Resource records in the backend.
 */

// Pitch IDs from database
export const PITCH_IDS = {
  MAIN: "ff302317-1c3b-4cd5-88d3-25ecb10b6a05",
  MINOR: "67146e16-28ed-49fb-8bd6-a626348106cd",
  FULL: "46e7c7a5-a9c1-4928-8545-919fa239471c", // Alternative full pitch
} as const;

// Pitch names for display
export const PITCH_NAMES = {
  [PITCH_IDS.MAIN]: "Main Pitch",
  [PITCH_IDS.MINOR]: "Minor Pitch",
  [PITCH_IDS.FULL]: "Full Pitch",
} as const;

// Area selection options
export type AreaSelection =
  | "whole"
  | "half-left"
  | "half-right"
  | "half-top"
  | "half-bottom"
  | "quarter-tl"
  | "quarter-tr"
  | "quarter-bl"
  | "quarter-br";

export const AREA_LABELS: Record<AreaSelection, string> = {
  "whole": "Whole Pitch",
  "half-left": "Half (Left)",
  "half-right": "Half (Right)",
  "half-top": "Half (Top)",
  "half-bottom": "Half (Bottom)",
  "quarter-tl": "Quarter (Top-Left)",
  "quarter-tr": "Quarter (Top-Right)",
  "quarter-bl": "Quarter (Bottom-Left)",
  "quarter-br": "Quarter (Bottom-Right)",
};
