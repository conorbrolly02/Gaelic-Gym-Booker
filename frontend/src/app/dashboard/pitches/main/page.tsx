"use client";

/**
 * Main Pitch Booking Page
 *
 * Uses the PitchBookingBase component with Main Pitch configuration.
 */

import PitchBookingBase from "@/components/PitchBookingBase";
import { PITCH_IDS, PITCH_NAMES } from "@/constants/pitches";

export default function MainPitchPage() {
  return (
    <PitchBookingBase
      pitchId={PITCH_IDS.MAIN}
      pitchName={PITCH_NAMES[PITCH_IDS.MAIN]}
    />
  );
}
