import PitchBookingBase from "@/components/PitchBookingBase";
import { PITCH_IDS } from "@/constants/pitches";

export default function MainPitchPage() {
  return (
    <PitchBookingBase
      pitchId={PITCH_IDS.MAIN}
      pitchName="Main Pitch"
    />
  );
}