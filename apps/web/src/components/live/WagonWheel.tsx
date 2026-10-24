"use client";

import type { Delivery, ShotTag } from "@npl/cricket-core";

const R = 100;

/** Position of a tagged shot. Straight down the ground is up; the batter is at the centre. */
export const shotXY = (s: ShotTag) => {
  const a = (s.angle * Math.PI) / 180;
  return { x: Math.sin(a) * R * s.distance, y: -Math.cos(a) * R * s.distance };
};

/** Inverse of shotXY for a click at (x, y) relative to the centre, in field units. */
export const tagFromXY = (x: number, y: number): ShotTag => {
  const d = Math.min(1, Math.hypot(x, y) / R);
  const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  return { angle: Math.round(angle), distance: Math.round(d * 100) / 100 };
};

const colour = (d: Delivery) => (d.isBoundary && d.runsBat === 6 ? "var(--ww-six)" : d.isBoundary && d.runsBat >= 4 ? "var(--ww-four)" : "var(--ww-run)");

export function WagonWheel({
  shots,
  scoringShots,
  onPick,
  label,
}: {
  shots: { delivery: Delivery; shot: ShotTag }[];
  /** Total scoring shots in the selection, so coverage is honest. */
  scoringShots?: number;
  onPick?: (t: ShotTag) => void;
  label: string;
}) {
  const pick = onPick
    ? (e: React.MouseEvent<SVGSVGElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const scale = 230 / r.width;
        onPick(tagFromXY((e.clientX - r.left) * scale - 115, (e.clientY - r.top) * scale - 115));
      }
    : undefined;

  return (
    <figure className="ww">
      <svg viewBox="-115 -115 230 230" role={onPick ? "button" : "img"} aria-label={label} onClick={pick} style={{ cursor: onPick ? "crosshair" : undefined }}>
        <circle r={R} className="ww-field" />
        <circle r={R * 0.45} className="ww-ring" />
        <rect x={-4} y={-22} width={8} height={30} className="ww-pitch" />
        <line x1={0} y1={-R} x2={0} y2={R} className="ww-axis" />
        <line x1={-R} y1={0} x2={R} y2={0} className="ww-axis" />
        <text y={-R - 4} textAnchor="middle" className="ww-lbl">STRAIGHT</text>
        {shots.map(({ delivery, shot }, i) => {
          const { x, y } = shotXY(shot);
          return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke={colour(delivery)} strokeWidth={delivery.isBoundary ? 1.8 : 1.1} strokeLinecap="round" />;
        })}
        <circle r={2.5} className="ww-bat" />
      </svg>
      {!onPick && (
        <figcaption className="caption">
          <span><i className="ww-key" style={{ background: "var(--ww-four)" }} /> Four</span>
          <span><i className="ww-key" style={{ background: "var(--ww-six)" }} /> Six</span>
          <span><i className="ww-key" style={{ background: "var(--ww-run)" }} /> Runs</span>
          {scoringShots !== undefined && <span>{shots.length} of {scoringShots} scoring shots tagged</span>}
        </figcaption>
      )}
    </figure>
  );
}
