"use client";

/**
 * ClubhousePlan Component — L-shaped, tuned to your latest screenshot
 * - CR1 reaches bottom; CR2 narrowed (no overlaps)
 * - Store removed; Kitchen wider; Committee narrower
 * - Labels centered; toilets narrower and moved down
 * - Clickable groups with stable IDs and data-* attributes
 */

import React from "react";

interface ClubhousePlanProps {
  onRoomSelect: (roomId: string, roomName: string) => void;
  selectedRooms?: string[];
}

export default function ClubhousePlan({
  onRoomSelect,
  selectedRooms = [],
}: ClubhousePlanProps) {
  const handleRoomClick = (roomId: string, roomName: string) => {
    onRoomSelect(roomId, roomName);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    roomId: string,
    roomName: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRoomClick(roomId, roomName);
    }
  };

  const isSelected = (roomId: string) => selectedRooms.includes(roomId);

  // ---- Layout (numbers grouped for easy tweaking) ----
  // Outer L shape: top block x:900..1330 (w=430), y:70..450; lower run x:70..1330, y:420..930
  const OUTER = { left: 70, right: 1330, top: 70, bottom: 930, kneeX: 900, kneeY: 420 };

  // Top block rooms
  const COMMITTEE = { x: 920, y: 90, w: 280, h: 240 };   // narrower
  const KITCHEN   = { x: 1220, y: 90, w: 90,  h: 240 };  // slightly wider (keeps 20px right margin)

  // Lower run, left section
  const CR4       = { x: 90,  y: 440, w: 260, h: 180 };
  const CR3       = { x: 90,  y: 640, w: 260, h: 250 };
  const ROOM2     = { x: 370, y: 440, w: 260, h: 140 };
  const REFCR     = { x: 650, y: 440, w: 220, h: 140 };

  // Toilets (narrower + moved down)
  const WOMENWC   = { x: 370, y: 720, w: 220, h: 90  };
  const MENWC     = { x: 370, y: 820, w: 220, h: 90  };

  // Lower run, right section
  const CR2       = { x: 760, y: 760, w: 300, h: 160 };  // narrowed to avoid CR1
  const CR1       = { x: 1120, y: 520, w: 210, h: OUTER.bottom - 520 }; // reaches bottom

  return (
    <svg
      id="facility-plan"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1380 980"
      className="w-full h-auto"
      aria-labelledby="title desc"
      role="img"
    >
      <title id="title">Clubhouse Floor Plan</title>
      <desc id="desc">
        L-shaped clubhouse plan with clickable rooms. Labels centered; CR1 extends to the
        bottom wall; CR2 narrowed; toilets moved down and narrowed; store removed.
      </desc>

      <style>{`
        .walls {
          fill: none;
          stroke: #222;
          stroke-width: 3.5;
          vector-effect: non-scaling-stroke;
        }
        .room rect {
          fill: #fff;
          stroke: #222;
          stroke-width: 3;
          vector-effect: non-scaling-stroke;
          transition: fill .15s ease;
        }
        .room { cursor: pointer; outline: none; }
        .room:hover rect, .room:focus rect { fill: #eaf4ff; }
        .room.selected rect {
          fill: #cce7ff;
          stroke: #1890ff;
          stroke-width: 4;
        }
        .non-bookable rect {
          fill: #f7f7f7;
          stroke: #222;
          stroke-width: 3;
          vector-effect: non-scaling-stroke;
        }
        .label {
          fill: #222;
          font-family: Inter, Segoe UI, Arial, sans-serif;
          font-size: 17px;
          font-weight: 600;
          text-anchor: middle;
          dominant-baseline: middle;
          pointer-events: none;
        }
        /* Optional small amenity icon tone-down */
        .icon {
          fill: none;
          stroke: #444;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .7;
          pointer-events: none;
        }
      `}</style>

      {/* ---------- Amenity icons (symbols) ---------- */}
      <defs>
        <symbol id="icon-kitchen" viewBox="0 0 24 24">
          <path d="M6 3v8M10 3v8M6 7h4" className="icon" />
          <path d="M17 3v8m0 0c2 0 2-3 2-4.5S19 3 17 3" className="icon" />
        </symbol>
        <symbol id="icon-committee" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="2" className="icon" />
          <circle cx="12" cy="6" r="2" className="icon" />
          <circle cx="18" cy="6" r="2" className="icon" />
          <rect x="3" y="10" width="18" height="7" rx="1.5" className="icon" />
        </symbol>
        <symbol id="icon-ref" viewBox="0 0 24 24">
          <path d="M4 12h7a5 5 0 1 1 0 5H8l-2 2v-7z" className="icon" />
          <circle cx="16" cy="14.5" r="1.5" className="icon" />
        </symbol>
        <symbol id="icon-cr" viewBox="0 0 24 24">
          <path d="M6 5l4 3h4l4-3 2 3-3 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10L4 8l2-3z" className="icon" />
        </symbol>
        <symbol id="icon-room" viewBox="0 0 24 24">
          <rect x="4" y="6" width="16" height="12" rx="2" className="icon" />
          <path d="M8 10h8M8 14h8" className="icon" />
        </symbol>
        <symbol id="icon-wc" viewBox="0 0 24 24">
          <rect x="3" y="4" width="6" height="5" rx="1" className="icon" />
          <rect x="11" y="9" width="10" height="7" rx="2" className="icon" />
          <path d="M16 16v3a4 4 0 0 1-4 4H7" className="icon" />
        </symbol>
      </defs>

      {/* ---------- Single L-shaped outer wall (path) ---------- */}
      <path
        className="walls"
        d={[
          `M ${OUTER.kneeX} ${OUTER.top}`,
          `H ${OUTER.right}`,
          `V ${OUTER.bottom}`,
          `H ${OUTER.left}`,
          `V ${OUTER.kneeY}`,
          `H ${OUTER.kneeX}`,
          `V ${OUTER.top}`,
          "Z",
        ].join(" ")}
      />

      {/* Short sill line above CR1 (nudged above CR1 top to avoid double-stroke overlap) */}
      <line className="walls" x1="1120" y1="518" x2="1330" y2="518" />

      {/* ---------- TOP BLOCK ---------- */}

      {/* Committee Room (narrower) */}
      <g
        id="room-Committee"
        className={`room ${isSelected("Committee") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Committee Room"
        onClick={() => handleRoomClick("Committee", "Committee Room")}
        onKeyDown={(e) => handleKeyDown(e, "Committee", "Committee Room")}
        data-room-id="Committee"
        data-type="meeting"
      >
        <title>Committee Room</title>
        <rect x={COMMITTEE.x} y={COMMITTEE.y} width={COMMITTEE.w} height={COMMITTEE.h} rx={4} />
        {/* optional icon (top-left) */}
        <use href="#icon-committee" x={COMMITTEE.x + 10} y={COMMITTEE.y + 10} width={20} height={20} />
        <text className="label" x={COMMITTEE.x + COMMITTEE.w / 2} y={COMMITTEE.y + COMMITTEE.h / 2}>
          Committee Room
        </text>
      </g>

      {/* Kitchen (slightly wider) */}
      <g
        id="room-Kitchen"
        className={`room ${isSelected("Kitchen") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Kitchen"
        onClick={() => handleRoomClick("Kitchen", "Kitchen")}
        onKeyDown={(e) => handleKeyDown(e, "Kitchen", "Kitchen")}
        data-room-id="Kitchen"
        data-type="kitchen"
      >
        <title>Kitchen</title>
        <rect x={KITCHEN.x} y={KITCHEN.y} width={KITCHEN.w} height={KITCHEN.h} rx={4} />
        <use href="#icon-kitchen" x={KITCHEN.x + 10} y={KITCHEN.y + 10} width={20} height={20} />
        <text className="label" x={KITCHEN.x + KITCHEN.w / 2} y={KITCHEN.y + KITCHEN.h / 2}>
          Kitchen
        </text>
      </g>

      {/* ---------- LOWER RUN: LEFT SECTION ---------- */}

      {/* CR 4 */}
      <g
        id="room-CR4"
        className={`room ${isSelected("CR4") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Changing Room 4"
        onClick={() => handleRoomClick("CR4", "Changing Room 4")}
        onKeyDown={(e) => handleKeyDown(e, "CR4", "Changing Room 4")}
        data-room-id="CR4"
        data-type="changing-room"
      >
        <title>Changing Room 4</title>
        <rect x={CR4.x} y={CR4.y} width={CR4.w} height={CR4.h} rx={4} />
        <use href="#icon-cr" x={CR4.x + 10} y={CR4.y + 10} width={20} height={20} />
        <text className="label" x={CR4.x + CR4.w / 2} y={CR4.y + CR4.h / 2}>CR 4</text>
      </g>

      {/* CR 3 */}
      <g
        id="room-CR3"
        className={`room ${isSelected("CR3") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Changing Room 3"
        onClick={() => handleRoomClick("CR3", "Changing Room 3")}
        onKeyDown={(e) => handleKeyDown(e, "CR3", "Changing Room 3")}
        data-room-id="CR3"
        data-type="changing-room"
      >
        <title>Changing Room 3</title>
        <rect x={CR3.x} y={CR3.y} width={CR3.w} height={CR3.h} rx={4} />
        <use href="#icon-cr" x={CR3.x + 10} y={CR3.y + 10} width={20} height={20} />
        <text className="label" x={CR3.x + CR3.w / 2} y={CR3.y + CR3.h / 2}>CR 3</text>
      </g>

      {/* Room 2 */}
      <g
        id="room-Room2"
        className={`room ${isSelected("Room2") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Room 2"
        onClick={() => handleRoomClick("Room2", "Room 2")}
        onKeyDown={(e) => handleKeyDown(e, "Room2", "Room 2")}
        data-room-id="Room2"
        data-type="multipurpose"
      >
        <title>Room 2</title>
        <rect x={ROOM2.x} y={ROOM2.y} width={ROOM2.w} height={ROOM2.h} rx={4} />
        <use href="#icon-room" x={ROOM2.x + 10} y={ROOM2.y + 10} width={20} height={20} />
        <text className="label" x={ROOM2.x + ROOM2.w / 2} y={ROOM2.y + ROOM2.h / 2}>Room 2</text>
      </g>

      {/* Ref CR */}
      <g
        id="room-RefCR"
        className={`room ${isSelected("RefCR") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Referee Changing Room"
        onClick={() => handleRoomClick("RefCR", "Referee Changing Room")}
        onKeyDown={(e) => handleKeyDown(e, "RefCR", "Referee Changing Room")}
        data-room-id="RefCR"
        data-type="referee-changing"
      >
        <title>Referee Changing Room</title>
        <rect x={REFCR.x} y={REFCR.y} width={REFCR.w} height={REFCR.h} rx={4} />
        <use href="#icon-ref" x={REFCR.x + 10} y={REFCR.y + 10} width={20} height={20} />
        <text className="label" x={REFCR.x + REFCR.w / 2} y={REFCR.y + REFCR.h / 2}>Ref CR</text>
      </g>

      {/* Women Toilets (narrower + lower) */}
      <g className="non-bookable" id="room-WomenToilets" data-room-id="WomenToilets" data-type="toilet" aria-label="Women Toilets">
        <title>Women Toilets (Not Bookable)</title>
        <rect x={WOMENWC.x} y={WOMENWC.y} width={WOMENWC.w} height={WOMENWC.h} rx={4} />
        <use href="#icon-wc" x={WOMENWC.x + 10} y={WOMENWC.y + 10} width={18} height={18} />
        <text className="label" x={WOMENWC.x + WOMENWC.w / 2} y={WOMENWC.y + WOMENWC.h / 2}>Women Toilets</text>
      </g>

      {/* Men Toilets (narrower + lower) */}
      <g className="non-bookable" id="room-MenToilets" data-room-id="MenToilets" data-type="toilet" aria-label="Men Toilets">
        <title>Men Toilets (Not Bookable)</title>
        <rect x={MENWC.x} y={MENWC.y} width={MENWC.w} height={MENWC.h} rx={4} />
        <use href="#icon-wc" x={MENWC.x + 10} y={MENWC.y + 10} width={18} height={18} />
        <text className="label" x={MENWC.x + MENWC.w / 2} y={MENWC.y + MENWC.h / 2}>Men Toilets</text>
      </g>

      {/* ---------- LOWER RUN: RIGHT SECTION ---------- */}

      {/* CR 2 (narrower) */}
      <g
        id="room-CR2"
        className={`room ${isSelected("CR2") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Changing Room 2"
        onClick={() => handleRoomClick("CR2", "Changing Room 2")}
        onKeyDown={(e) => handleKeyDown(e, "CR2", "Changing Room 2")}
        data-room-id="CR2"
        data-type="changing-room"
      >
        <title>Changing Room 2</title>
        <rect x={CR2.x} y={CR2.y} width={CR2.w} height={CR2.h} rx={4} />
        <use href="#icon-cr" x={CR2.x + 10} y={CR2.y + 10} width={20} height={20} />
        <text className="label" x={CR2.x + CR2.w / 2} y={CR2.y + CR2.h / 2}>CR 2</text>
      </g>

      {/* CR 1 (full height to bottom wall) */}
      <g
        id="room-CR1"
        className={`room ${isSelected("CR1") ? "selected" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Changing Room 1"
        onClick={() => handleRoomClick("CR1", "Changing Room 1")}
        onKeyDown={(e) => handleKeyDown(e, "CR1", "Changing Room 1")}
        data-room-id="CR1"
        data-type="changing-room"
      >
        <title>Changing Room 1</title>
        <rect x={CR1.x} y={CR1.y} width={CR1.w} height={CR1.h} rx={4} />
        <use href="#icon-cr" x={CR1.x + 10} y={CR1.y + 10} width={20} height={20} />
        <text className="label" x={CR1.x + CR1.w / 2} y={CR1.y + CR1.h / 2}>CR 1</text>
      </g>
    </svg>
  );
}
