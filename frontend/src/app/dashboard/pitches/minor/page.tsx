"use client";

/**
 * Minor Pitch Booking Page
 *
 * Uses the PitchBookingBase component with Minor Pitch configuration.
 */

import PitchBookingBase from "@/components/PitchBookingBase";
import { PITCH_IDS, PITCH_NAMES } from "@/constants/pitches";

export default function MinorPitchPage() {
  return (
    <PitchBookingBase
      pitchId={PITCH_IDS.MINOR}
      pitchName={PITCH_NAMES[PITCH_IDS.MINOR]}
    />
  );
}
