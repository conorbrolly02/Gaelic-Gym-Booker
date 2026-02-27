"use client";

import React from "react";

/** Areas you can select on the pitch */
export type AreaMode = "whole" | "half" | "quarter";
export type AreaSelection =
  | "whole"
  | "half-left"
  | "half-right"
  | "quarter-tl"
  | "quarter-tr"
  | "quarter-bl"
  | "quarter-br";

export function areaLabel(a: AreaSelection): string {
  switch (a) {
    case "whole":
      return "Whole pitch";
    case "half-left":
      return "Left half";
    case "half-right":
      return "Right half";
    case "quarter-tl":
      return "Top-left quarter";
    case "quarter-tr":
      return "Top-right quarter";
    case "quarter-bl":
      return "Bottom-left quarter";
    case "quarter-br":
      return "Bottom-right quarter";
    default:
      return a;
  }
}

type Props = {
  /** Which area granularity is active */
  areaMode: AreaMode;
  /** Currently selected area */
  selected: AreaSelection;
  /** Called when a zone is clicked */
  onSelect: (area: AreaSelection) => void;
  /** Flip the pitch left↔right (if your image/orientation is reversed) */
  flipX?: boolean;
  /** Flip the pitch top↔bottom (rare; only if needed) */
  flipY?: boolean;
  /** Optional classname for container */
  className?: string;
};

/**
 * A responsive SVG Gaelic pitch with selectable zones.
 * ViewBox 1000x700 (10:7 aspect) to match your previous layout.
 */
export default function GaaPitchSvg({
  areaMode,
  selected,
  onSelect,
  flipX = false,
  flipY = false,
  className,
}: Props) {
  // Normalized dims for convenience
  const W = 1000;
  const H = 700;

  // Helpers to flip left/right or top/bottom
  const maybeFlipX = (x: number) => (flipX ? W - x : x);
  const maybeFlipY = (y: number) => (flipY ? H - y : y);

  /** Zones (rects) in SVG units */
  const zones = {
    whole: [{ id: "whole" as const, x: 0, y: 0, w: W, h: H, label: "Whole pitch" }],
    halves: [
      { id: (flipX ? "half-right" : "half-left") as const, x: maybeFlipX(0),   y: 0, w: W / 2, h: H, label: flipX ? "Right half" : "Left half" },
      { id: (flipX ? "half-left"  : "half-right") as const, x: maybeFlipX(W/2), y: 0, w: W / 2, h: H, label: flipX ? "Left half"  : "Right half" },
    ],
    quarters: [
      { id: (flipX ? "quarter-tr" : "quarter-tl") as const, x: maybeFlipX(0),   y: maybeFlipY(0),   w: W / 2, h: H / 2, label: flipX ? "Top-right"    : "Top-left" },
      { id: (flipX ? "quarter-tl" : "quarter-tr") as const, x: maybeFlipX(W/2), y: maybeFlipY(0),   w: W / 2, h: H / 2, label: flipX ? "Top-left"     : "Top-right" },
      { id: (flipX ? "quarter-br" : "quarter-bl") as const, x: maybeFlipX(0),   y: maybeFlipY(H/2), w: W / 2, h: H / 2, label: flipX ? "Bottom-right" : "Bottom-left" },
      { id: (flipX ? "quarter-bl" : "quarter-br") as const, x: maybeFlipX(W/2), y: maybeFlipY(H/2), w: W / 2, h: H / 2, label: flipX ? "Bottom-left"  : "Bottom-right" },
    ],
  };

  /** Lines styling */
  const lineStroke = "#ffffff";
  const lineWidth = 4;

  /** Render a selectable rectangle overlay */
  const Zone = ({
    id,
    x,
    y,
    w,
    h,
    label,
    isSelected,
    onActivate,
  }: {
    id: AreaSelection;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    isSelected: boolean;
    onActivate: () => void;
  }) => (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onActivate()}
      className="cursor-pointer outline-none focus:ring-4 focus:ring-emerald-500/60 rounded"
    >
      {/* Hover/selected fill */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="#10b981"
        opacity={isSelected ? 0.22 : 0} // show only when selected; hover handled by the stroke rect below
      />
      {/* Stroke on hover/selected */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        stroke="#10b981"
        strokeWidth={isSelected ? 8 : 0}
        className="transition-[stroke-width] duration-150 ease-in-out hover:stroke-[6px]"
      />
      {/* Invisible rect to enlarge pointer hit area on narrow screens */}
      <rect x={x} y={y} width={w} height={h} fill="transparent" />
      <title>{label}</title>
    </g>
  );

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto rounded-xl shadow-sm border border-gray-200 bg-[#147a2c]"
        role="img"
        aria-label="GAA pitch"
      >
        {/* Grass stripes */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect
            key={i}
            x={0}
            y={(H / 10) * i}
            width={W}
            height={H / 10}
            fill={i % 2 === 0 ? "#0f6a24" : "#147a2c"}
            opacity={0.9}
          />
        ))}

        {/* Outer boundary */}
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />

        {/* Halfway line */}
        <line x1={W / 2} y1={10} x2={W / 2} y2={H - 10} stroke={lineStroke} strokeWidth={lineWidth} />

        {/* Center circle */}
        <circle cx={W / 2} cy={H / 2} r={50} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />
        {/* Center mark */}
        <circle cx={W / 2} cy={H / 2} r={4} fill={lineStroke} />

        {/* Goal rectangles (simplified) */}
        {/* Left end */}
        <rect x={10} y={H / 2 - 80} width={70} height={160} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />
        <rect x={10} y={H / 2 - 40} width={30} height={80} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />

        {/* Right end */}
        <rect x={W - 80} y={H / 2 - 80} width={70} height={160} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />
        <rect x={W - 40} y={H / 2 - 40} width={30} height={80} fill="none" stroke={lineStroke} strokeWidth={lineWidth} />

        {/* Selectable zones (overlay on top of lines) */}
        <g>
          {areaMode === "whole" &&
            zones.whole.map((z) => (
              <Zone
                key={z.id}
                id={z.id}
                x={z.x}
                y={z.y}
                w={z.w}
                h={z.h}
                label={z.label}
                isSelected={selected === z.id}
                onActivate={() => onSelect(z.id)}
              />
            ))}

          {areaMode === "half" &&
            zones.halves.map((z) => (
              <Zone
                key={z.id}
                id={z.id}
                x={z.x}
                y={z.y}
                w={z.w}
                h={z.h}
                label={z.label}
                isSelected={selected === z.id}
                onActivate={() => onSelect(z.id)}
              />
            ))}

          {areaMode === "quarter" &&
            zones.quarters.map((z) => (
              <Zone
                key={z.id}
                id={z.id}
                x={z.x}
                y={z.y}
                w={z.w}
                h={z.h}
                label={z.label}
                isSelected={selected === z.id}
                onActivate={() => onSelect(z.id)}
              />
            ))}
        </g>
      </svg>
    </div>
  );
}