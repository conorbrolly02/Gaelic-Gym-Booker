import PitchBookingBase from "@/components/PitchBookingBase";
import { PITCH_IDS } from "@/constants/pitches";

export default function MinorPitchPage() {
  return (
    <PitchBookingBase
      pitchId={PITCH_IDS.MINOR}
      pitchName="Minor Pitch"
    />
  );
}