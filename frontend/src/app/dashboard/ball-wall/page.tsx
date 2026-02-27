"use client";

/**
 * Ball Wall Booking Page
 *
 * Renders the BallWallBookingBase component for the ball wall facility.
 * Allows users to book either the left court, right court, or both courts.
 */

import BallWallBookingBase from "@/components/BallWallBookingBase";
import { BALL_WALL_ID } from "@/constants/ballwall";

export default function BallWallBookingPage() {
  return (
    <BallWallBookingBase
      ballWallId={BALL_WALL_ID}
      ballWallName="Ball Wall"
    />
  );
}
