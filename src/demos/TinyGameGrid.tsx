/**
 * One frame of the tiny game (src/models/tinyGame.ts) as SVG: the player a filled square, the coin a circle. `tone`
 * says whose frame it is (gray-700 = the true game, amber = a model's frame); `mark` outlines cells (e.g. where the
 * model's frame differs from the truth).
 */
import { H, PLAYER, COIN, W, type Frame } from "../models/tinyGame.ts";

export const TONE = { truth: "#374151", model: "#b45309", second: "#0284c7" } as const;
const S = 20;

export default function TinyGameGrid({ frame, tone, mark, label, size = "max-w-[180px]" }: { frame: Frame; tone: string; mark?: boolean[]; label: string; size?: string }) {
  return (
    <svg viewBox={`-1 -1 ${W * S + 2} ${H * S + 2}`} className={`h-auto w-full ${size}`} role="img" aria-label={label}>
      <rect x={0} y={0} width={W * S} height={H * S} fill="white" stroke={tone} strokeWidth={1.5} rx={3} />
      {frame.map((c, i) => {
        const x = (i % W) * S;
        const y = Math.floor(i / W) * S;
        return (
          <g key={i}>
            <rect x={x + 0.5} y={y + 0.5} width={S - 1} height={S - 1} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
            {c === PLAYER && <rect x={x + 4} y={y + 4} width={S - 8} height={S - 8} rx={2} fill={tone} />}
            {c === COIN && <circle cx={x + S / 2} cy={y + S / 2} r={5} fill="none" stroke={tone} strokeWidth={2} />}
            {mark?.[i] && <rect x={x + 1.5} y={y + 1.5} width={S - 3} height={S - 3} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 2" />}
          </g>
        );
      })}
      {/* 2 × 2 patch boundaries: one token each */}
      {[2, 4].map((x) => <line key={`v${x}`} x1={x * S} y1={0} x2={x * S} y2={H * S} stroke={tone} strokeOpacity={0.25} strokeDasharray="2 2" />)}
      <line x1={0} y1={2 * S} x2={W * S} y2={2 * S} stroke={tone} strokeOpacity={0.25} strokeDasharray="2 2" />
    </svg>
  );
}

/** A frame's tokens as small boxes (UNKNOWN = −1 shown as "?"). */
export function TokenRow({ tokens, tone }: { tokens: number[]; tone: string }) {
  return (
    <div className="flex justify-center gap-1 font-mono text-[11px]" aria-label={`tokens ${tokens.map((t) => (t < 0 ? "?" : t)).join(" ")}`}>
      {tokens.map((t, i) => (
        <span key={i} className="inline-flex h-5 w-6 items-center justify-center rounded border bg-white" style={{ borderColor: tone, color: tone }}>
          {t < 0 ? "?" : t}
        </span>
      ))}
    </div>
  );
}
