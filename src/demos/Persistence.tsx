/**
 * Frames versus an explicit scene (src/models/persistence.ts). The camera turns; (a) a frame model makes each view
 * from its last few views only, (b) an explicit splat scene is projected. Turn away and back: columns where (a) now
 * shows something other than what it showed the first time it looked there are outlined in red. A small map shows the
 * splats from above and the camera's field of view.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { makeScene, PALETTE, renderScene, RING, sameColumn, startFrameModel, stepFrameModel, VIEW, type FrameModel, type View } from "../models/persistence.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";

const CW = 30;
const SH = 80;
const START_YAW = 0;

function Strip({ view, tone, changed, label }: { view: View; tone: string; changed?: boolean[]; label: string }) {
  return (
    <svg viewBox={`-1 -1 ${VIEW * CW + 2} ${SH + 2}`} className="h-auto w-full max-w-[260px]" role="img" aria-label={label}>
      <rect width={VIEW * CW} height={SH} fill="#f8fafc" stroke={tone} strokeWidth={1.5} rx={3} />
      <line x1={0} y1={SH - 10} x2={VIEW * CW} y2={SH - 10} stroke="#cbd5e1" />
      {view.map((c, i) =>
        c ? <rect key={i} x={i * CW + 0.5} y={SH - 10 - c.height * (SH - 16)} width={CW - 1} height={c.height * (SH - 16)} fill={PALETTE[c.colour]} /> : null,
      )}
      {changed?.map((x, i) => (x ? <rect key={`c${i}`} x={i * CW + 1.5} y={2} width={CW - 3} height={SH - 4} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 3" /> : null))}
    </svg>
  );
}

function TopMap({ yaw }: { yaw: number }) {
  const scene = useMemo(() => makeScene(), []);
  const R = 60;
  const S = 6.5;
  const ang = (col: number) => (col / RING) * 2 * Math.PI - Math.PI / 2;
  const a0 = ang(yaw);
  const a1 = ang(yaw + VIEW);
  return (
    <svg viewBox={`0 0 ${2 * R} ${2 * R}`} className="h-auto w-full max-w-[120px]" role="img" aria-label="map">
      <circle cx={R} cy={R} r={R - 1} fill="white" stroke="#e5e7eb" />
      <path d={`M${R} ${R} L${R + (R - 2) * Math.cos(a0)} ${R + (R - 2) * Math.sin(a0)} A${R - 2} ${R - 2} 0 0 1 ${R + (R - 2) * Math.cos(a1)} ${R + (R - 2) * Math.sin(a1)} Z`} fill="#0284c7" fillOpacity={0.12} stroke="#0284c7" strokeOpacity={0.5} />
      {scene.map((s, i) => (
        <circle key={i} cx={R + s.dist * S * Math.cos(ang(s.az))} cy={R + s.dist * S * Math.sin(ang(s.az))} r={2.4} fill={PALETTE[s.colour]} />
      ))}
      <circle cx={R} cy={R} r={3} fill="#374151" />
    </svg>
  );
}

export default function Persistence() {
  const { pick } = useLang();
  const scene = useMemo(() => makeScene(), []);
  const [memory, setMemory] = useState(3);
  const fresh = () => startFrameModel(renderScene(scene, START_YAW), START_YAW);
  const [model, setModel] = useState<FrameModel>(fresh);
  // what (a) showed the first time it looked in each direction
  const [firstSeen, setFirstSeen] = useState<Record<number, View>>(() => ({ [START_YAW]: renderScene(scene, START_YAW) }));
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const live = useRef({ model, memory, firstSeen });
  live.current = { model, memory, firstSeen };

  const move = (dir: 1 | -1) => {
    const next = stepFrameModel(live.current.model, dir, live.current.memory);
    const seen = live.current.firstSeen;
    const fs = next.yaw in seen ? seen : { ...seen, [next.yaw]: next.memory.at(-1)!.view };
    live.current = { ...live.current, model: next, firstSeen: fs };
    setModel(next);
    setFirstSeen(fs);
  };
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setBusy(false);
  };
  useEffect(() => stop, []);

  const roundTrip = () => {
    stop();
    const plan: (1 | -1)[] = [...new Array(RING / 2).fill(1), ...new Array(RING / 2).fill(-1)];
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      plan.forEach((d) => move(d));
      return;
    }
    setBusy(true);
    let k = 0;
    timer.current = window.setInterval(() => {
      if (k >= plan.length) return stop();
      move(plan[k++]);
    }, 70);
  };
  const reset = () => {
    stop();
    const m = fresh();
    setModel(m);
    setFirstSeen({ [START_YAW]: renderScene(scene, START_YAW) });
  };

  const viewA = model.memory.at(-1)!.view;
  const viewB = renderScene(scene, model.yaw);
  const before = firstSeen[model.yaw];
  const changed = before ? viewA.map((c, i) => !sameColumn(c, before[i])) : undefined;
  const nChanged = changed?.filter(Boolean).length ?? 0;
  const deg = Math.round((model.yaw / RING) * 360);

  return (
    <div className="w-full max-w-xl space-y-3 text-xs text-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <DemoButton onClick={() => move(-1)}>◀ {pick(["turn left", "左轉"])}</DemoButton>
        <DemoButton onClick={() => move(1)}>{pick(["turn right", "右轉"])} ▶</DemoButton>
        <DemoButton onClick={roundTrip} active={busy}>{pick(["Turn 180° away and back", "轉開 180° 再轉回來"])}</DemoButton>
        <DemoButton onClick={reset}>{pick(["Reset", "重設"])}</DemoButton>
      </div>
      <Slider label={["Frame model's memory (views)", "畫面模型的記憶（幀數）"]} value={memory} min={1} max={24} onChange={setMemory} />
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <div className="space-y-0.5 text-center">
            <p className="font-medium text-amber-700">{pick(["(a) frames generated from the last few frames", "(a) 由最近幾幀生成的畫面"])}</p>
            <div className="flex justify-center">
              <Strip view={viewA} tone="#b45309" changed={changed} label={pick(["View from the frame model", "畫面模型的視野"])} />
            </div>
          </div>
          <div className="space-y-0.5 text-center">
            <p className="font-medium text-sky-700">{pick(["(b) an explicit 3-D scene of splats, projected", "(b) 明確的三維潑濺場景，投影而成"])}</p>
            <div className="flex justify-center">
              <Strip view={viewB} tone="#0284c7" label={pick(["View of the splat scene", "潑濺場景的視野"])} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <TopMap yaw={model.yaw} />
          <span className="font-mono text-gray-500">yaw {deg}° · t = {model.t}</span>
        </div>
      </div>
      <p className="min-h-10 rounded-md bg-white px-3 py-2" aria-live="polite">
        {!before || model.t === 0
          ? pick(["Both start from the same view. Turn away and come back.", "兩邊從同一個視野開始。轉開，再轉回來。"])
          : nChanged > 0
            ? pick([
                `Back at ${deg}°: in ${nChanged} of ${VIEW} columns (a) now shows something other than it showed the first time it looked here. (b) cannot change: it is the same splats, projected again.`,
                `回到 ${deg}°：(a) 有 ${nChanged}／${VIEW} 欄與第一次看這裡時不同。(b) 不會變：還是同一批潑濺，重新投影一次。`,
              ])
            : pick([
                `At ${deg}°, (a) shows what it showed the first time it looked here (it still remembers, or has not been here before).`,
                `在 ${deg}°，(a) 顯示的和第一次看這裡時一樣（它還記得，或之前沒來過）。`,
              ])}
      </p>
    </div>
  );
}
