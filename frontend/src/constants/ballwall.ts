/**
 * Ball Wall Constants
 *
 * Contains ball wall court selection options and labels.
 */

// Ball Wall ID from database
export const BALL_WALL_ID = "c4386a1a-adec-4833-ac0f-55d82c1ea356";

// Court selection options (simpler than pitch - only left, right, or both)
export type CourtSelection = "both" | "left" | "right";

export const COURT_LABELS: Record<CourtSelection, string> = {
  both: "Both Courts",
  left: "Left Court",
  right: "Right Court",
};
