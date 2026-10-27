// The hero: tracked agents. Named agents run work in the field; a tracking line reaches each run, the sandbox's
// brackets close around it, badges change, and agents are created, edited and deleted.
//  - labels sit on a clean halo and runs never land in a label's space
//  - tracking lines are gentle curves
//  - each agent has a pipeline of 1 to 6 numbered steps; a run shows its progress through them, every step taking
//    its own random time, and a failure stops at one of them
//  - hover an agent: its type, branch, commit and steps; hover a recorded run: which commit ran and how it ended
//  - after a failure and a fix, the agent's pipeline gains a regression test for the step that failed; the fix re-runs
//    in the very same hexagon and the regression test stays in every later run
//  - agents are edited now and then: a new commit, a new hash, and the next runs use it
//    ("Commits never change. Edit to save a new one.")
import { Field, ease, clamp, type Scene } from './field';

const POOL: [string, string][] = [
  ['Support triage', 'LLM'],
  ['Invoice reconciler', 'Software'],
  ['Access review', 'Software'],
  ['Onboarding checklist', 'Software'],
  ['Quarterly close', 'Software'],
  ['Revenue report', 'Software'],
  ['Vendor risk scan', 'Software'],
];
const STEP_POOL = ['Fetch records', 'Check access', 'Validate', 'Classify', 'Process', 'Transform', 'Reconcile', 'Summarize', 'Notify', 'Archive'];
// a pipeline of 1 to 6 steps: reads first and writes last when there are at least two
const MAX_STEPS = 6;
const MAX_TESTS = 3; // regression tests an agent keeps (the newest)
const pipeline = (max = MAX_STEPS): string[] => {
  const n = 1 + Math.floor(Math.random() * max);
  if (n === 1) return [Math.random() < 0.5 ? 'Process' : 'Read input'];
  const mid = [...STEP_POOL].sort(() => Math.random() - 0.5).slice(0, n - 2);
  return ['Read input', ...mid, 'Write output'];
};
// the agent's real pipeline: its base steps with its regression tests slotted in before the last step
const compose = (base: string[], tests: string[]): string[] => {
  const t = tests.map((s) => `Regression: ${s}`);
  return base.length < 2 ? [...base, ...t] : [...base.slice(0, -1), ...t, base[base.length - 1]];
};
const hash = () => Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const MONO = "500 9.5px 'IBM Plex Mono', monospace";
const BOLD = "600 12px 'IBM Plex Sans', system-ui, sans-serif";

type Fix = { phase: 'wait' | 'patch'; t: number; cell: number; name: string; added: boolean };
type Run = { target: number; t: number; phase: 'line' | 'box'; boxT: number; boxDur: number; ok: boolean; bend: number; failStep: number; steps: string[]; cum: number[]; failAt: number; fixOf?: Fix };
type Ag = {
  name: string;
  type: string;
  cell: number;
  hash: string;
  base: string[]; // the pipeline's own steps
  tests: string[]; // regression tests added by fixes: each one stays for good
  steps: string[]; // base + tests: the pipeline at the agent's current commit
  life: 'new' | 'live' | 'gone';
  lifeT: number;
  state: 'none' | 'running' | 'succeeded' | 'failed';
  wait: number;
  run: Run | null;
  fix: Fix | null; // after a failed run: wait, edit (a new commit), then re-run beside the failed cell
  tag: number; // ms left on the "created" tag
  edit: number; // ms left on the "new commit" tag
  bendSign: number;
};
type Trace = { x0: number; y0: number; x1: number; y1: number; bend: number; ok: boolean; age: number };

// point on a gentle quadratic curve from (x0,y0) to (x1,y1), bent sideways by `bend` (fraction of the length)
function curve(x0: number, y0: number, x1: number, y1: number, bend: number) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0;
  const cx = mx - dy * bend, cy = my + dx * bend;
  return { cx, cy, at: (t: number) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1] as [number, number] };
}

export function tracked(f: Field): Scene {
  // hover cards are for a real mouse; a tap or a scroll on a phone must not leave one on screen
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let ags: Ag[] = [];
  let traces: Trace[] = [];
  let rec = new Float32Array(0);
  let bad = new Uint8Array(0);
  let cellName: string[] = [];
  let cellHash: string[] = [];
  let cellNote: string[] = [];
  let cellWas: string[] = []; // a fixed cell remembers how it first failed
  let alerts: { i: number; t: number }[] = [];
  let pulses: { x: number; y: number; t: number }[] = [];
  let nextBorn = 9000;
  let nextGone = 15000;
  let nextEdit = 7000;

  const wide = () => f.W >= 900;
  // how many agents fit: roomy desktop 4 to 6, short laptop 3 to 4, phone 2 to 3 (each agent needs its own label space)
  const cap = () => (wide() ? (f.H >= 620 ? { start: 4, max: 6, min: 4 } : { start: 3, max: 4, min: 3 }) : { start: 2, max: 3, min: 2 });
  const region = (i: number) => {
    const x = f.cx(i), y = f.cy(i);
    return x >= (wide() ? f.W * 0.5 : f.R * 3) && x <= f.W - f.R * 3.4 && y >= (wide() ? f.R * 3.2 : f.H * 0.62) && y <= f.H - f.R * 3.6;
  };
  // the space under an agent holds its label and badge: keep runs out of it
  const inLabel = (i: number) => ags.some((a) => a.life !== 'gone' && Math.abs(f.cx(i) - f.cx(a.cell)) < f.R * 2.6 && f.cy(i) - f.cy(a.cell) > -f.R * 0.4 && f.cy(i) - f.cy(a.cell) < f.R * 2.9);
  const free = (i: number, minD: number) => ags.every((a) => a.life === 'gone' || Math.hypot(f.cx(a.cell) - f.cx(i), f.cy(a.cell) - f.cy(i)) > minD);
  // a cell holds a run's record while that record is still visible: nothing else may land on it
  // (a record is at full strength when written and halves every 30 s, so 0.5 is the first 30 s)
  const CLAIM = 0.5;
  const claimed = (i: number) => rec[i] > CLAIM;
  const live = () => ags.filter((a) => a.life === 'live');
  const make = (): Ag | null => {
    const used = new Set(ags.map((a) => a.name));
    const left = POOL.filter(([n]) => !used.has(n));
    if (!left.length) return null;
    const [name, type] = left[Math.floor(Math.random() * left.length)];
    const cell = f.pick((i) => region(i) && !claimed(i) && free(i, f.R * 5.8));
    if (cell < 0) return null;
    const base = pipeline();
    return { name, type, cell, hash: hash(), base, tests: [], steps: base, life: 'new', lifeT: 0, state: 'none', wait: 600 + Math.random() * 1800, run: null, fix: null, tag: 2600, edit: 0, bendSign: Math.random() < 0.5 ? -1 : 1 };
  };
  const startRun = (a: Ag, fix?: Fix): boolean => {
    const ax = f.cx(a.cell), ay = f.cy(a.cell);
    const usable = (i: number) => region(i) && !claimed(i) && free(i, f.R * 1.7) && !inLabel(i) && !ags.some((o) => o.run?.target === i);
    let target = -1;
    if (fix) {
      // the fixed run goes back to the very hexagon that failed (it is still claimed, so nothing else took it)
      if (ags.some((o) => o.run?.target === fix.cell)) return false;
      target = fix.cell;
    } else {
      target = f.pick((i) => {
        const d = Math.hypot(f.cx(i) - ax, f.cy(i) - ay);
        return d > f.R * 2.6 && d < f.R * 6.6 && usable(i);
      });
    }
    if (target < 0) { a.wait = 1200; return false; }
    const ok = fix ? true : Math.random() > 0.11;
    // every step takes its own random time, so no two runs have the same rhythm
    const n = a.steps.length;
    const cum: number[] = [];
    let t = 0;
    for (let i = 0; i < n; i++) cum.push((t += 380 + Math.random() * 900));
    const failStep = ok ? -1 : Math.floor(Math.random() * n);
    const start = failStep > 0 ? cum[failStep - 1] : 0;
    const failAt = failStep >= 0 ? start + (cum[failStep] - start) * 0.6 : 0; // a failing step dies part-way through
    a.run = { target, t: 0, phase: 'line', boxT: 0, boxDur: failStep >= 0 ? failAt + 550 : t + 250, ok, bend: a.bendSign * (0.12 + Math.random() * 0.1), failStep, steps: a.steps, cum, failAt, fixOf: fix };
    a.state = 'running';
    return true;
  };
  // pipeline progress inside the sandbox: which step is current, and whether the run has failed
  const progress = (r: Run) => {
    const failedNow = r.failStep >= 0 && r.phase === 'box' && r.boxT >= r.failAt;
    if (failedNow) return { cur: r.failStep, failedNow };
    const t = r.phase === 'box' ? r.boxT : 0;
    let cur = 0;
    while (cur < r.steps.length - 1 && t >= r.cum[cur]) cur++;
    return { cur, failedNow };
  };

  return {
    settle() {
      for (const a of ags) {
        a.wait = 1e9;
        if (a.run) { a.run.phase = 'box'; a.run.boxT = a.run.boxDur; }
      }
      nextBorn = nextGone = nextEdit = 1e9;
      // a failure's fix (wait, edit, re-run) takes a few steps: run them all so the still frame is resolved
      for (let k = 0; k < 12 && ags.some((a) => a.run || a.fix); k++) {
        for (const a of ags) if (a.run) { a.run.phase = 'box'; a.run.boxT = a.run.boxDur; }
        this.update(1500);
      }
      alerts = [];
      pulses = [];
      for (const a of ags) {
        a.wait = 1e9; // a run that finished above reset its timer: nothing may start again
        a.tag = a.edit = 0;
        if (a.life === 'new') a.life = 'live';
      }
      ags = ags.filter((a) => a.life !== 'gone');
    },
    layout() {
      const n = f.cols * f.rows;
      rec = new Float32Array(n);
      bad = new Uint8Array(n);
      cellName = new Array(n);
      cellHash = new Array(n);
      cellNote = new Array(n);
      cellWas = new Array(n);
      alerts = [];
      pulses = [];
      traces = [];
      ags = [];
      for (let k = 0; k < cap().start; k++) {
        const a = make();
        if (a) { a.life = 'live'; a.lifeT = 1; a.tag = 0; a.wait = 500 + k * 1100; ags.push(a); }
      }
    },
    update(dt) {
      f.warm(dt);
      const slow = Math.pow(0.5, dt / 30000);
      for (let i = 0; i < rec.length; i++) rec[i] *= slow;
      for (const al of alerts) al.t += dt;
      alerts = alerts.filter((a) => a.t < 2600);
      for (const p of pulses) p.t += dt;
      pulses = pulses.filter((p) => p.t < 1200);
      for (const t of traces) t.age += dt;
      traces = traces.filter((t) => t.age < 9000);

      for (const a of ags) {
        a.lifeT += dt;
        a.tag = Math.max(0, a.tag - dt);
        a.edit = Math.max(0, a.edit - dt);
        if (a.life === 'new' && a.lifeT > 1000) a.life = 'live';
        if (a.life !== 'live') continue;
        const r = a.run;
        if (!r) {
          if (a.fix) {
            // failed -> someone edits (a new commit) -> the pipeline runs again
            const fx = a.fix;
            fx.t += dt;
            if (fx.phase === 'wait' && fx.t > 1700) {
              fx.phase = 'patch';
              fx.t = 0;
              a.hash = hash();
              // the fix is committed together with a regression test for the step that failed
              const was = fx.name.replace(/^Regression: /, '');
              if (!a.tests.includes(was)) {
                a.tests = [...a.tests, was].slice(-MAX_TESTS);
                fx.added = true;
                // stay within six steps: make room by dropping one of the base steps in the middle
                while (a.base.length + a.tests.length > MAX_STEPS && a.base.length > 2) a.base = a.base.filter((_, i) => i !== 1 + Math.floor(Math.random() * (a.base.length - 2)));
                a.steps = compose(a.base, a.tests);
              }
              a.edit = 2800;
              pulses.push({ x: f.cx(a.cell), y: f.cy(a.cell), t: 0 });
            } else if (fx.phase === 'patch' && fx.t > 1500) startRun(a, fx);
            continue;
          }
          a.wait -= dt;
          if (a.wait <= 0) startRun(a);
          continue;
        }
        if (r.phase === 'line') {
          r.t += dt / 750;
          if (r.t >= 1) { r.phase = 'box'; r.boxT = 0; }
        } else {
          r.boxT += dt;
          if (r.boxT >= r.boxDur) {
            if (r.fixOf) cellWas[r.target] = cellNote[r.target]; // remember how this hexagon first failed
            rec[r.target] = 1;
            bad[r.target] = r.ok ? 0 : 1;
            cellName[r.target] = a.name;
            cellHash[r.target] = a.hash;
            cellNote[r.target] = r.fixOf ? `fixed · ${r.fixOf.added ? 'regression test added' : 'regression test passed'}` : r.ok ? `${r.steps.length} step${r.steps.length > 1 ? 's' : ''} · all passed` : `failed at 0${r.failStep + 1} ${r.steps[r.failStep]}`;
            a.state = r.ok ? 'succeeded' : 'failed';
            traces.push({ x0: f.cx(a.cell), y0: f.cy(a.cell), x1: f.cx(r.target), y1: f.cy(r.target), bend: r.bend, ok: r.ok, age: 0 });
            if (!r.ok) {
              alerts.push({ i: r.target, t: 0 });
              a.fix = { phase: 'wait', t: 0, cell: r.target, name: r.steps[r.failStep], added: false };
            }
            if (r.fixOf) {
              // the same hexagon turns from red to blue: the fix worked. A pulse marks it.
              pulses.push({ x: f.cx(r.target), y: f.cy(r.target), t: 0 });
              a.fix = null;
            }
            a.run = null;
            a.wait = 2400 + Math.random() * 3600;
          }
        }
      }
      ags = ags.filter((a) => !(a.life === 'gone' && a.lifeT > 1500));

      nextBorn -= dt;
      nextGone -= dt;
      nextEdit -= dt;
      const lv = live();
      if (nextBorn <= 0) {
        nextBorn = 12000 + Math.random() * 4000;
        if (lv.length < cap().max) { const a = make(); if (a) ags.push(a); }
      }
      if (nextGone <= 0) {
        nextGone = 17000 + Math.random() * 5000;
        const idle = lv.filter((a) => !a.run && !a.fix).sort((x, y) => y.lifeT - x.lifeT)[0];
        if (lv.length > cap().min && idle) { idle.life = 'gone'; idle.lifeT = 0; }
      }
      if (nextEdit <= 0) {
        nextEdit = 9000 + Math.random() * 5000;
        const idle = lv.filter((a) => !a.run && !a.fix);
        const a = idle[Math.floor(Math.random() * idle.length)];
        if (a) {
          a.hash = hash();
          // a new commit can also change the pipeline: steps added or removed
          // a new commit can also change the pipeline, but its regression tests stay
          if (Math.random() < 0.6) {
            a.base = pipeline(MAX_STEPS - a.tests.length);
            a.steps = compose(a.base, a.tests);
          }
          a.edit = 2600;
          pulses.push({ x: f.cx(a.cell), y: f.cy(a.cell), t: 0 });
        }
      }
    },
    draw() {
      const { ctx, c } = f;
      for (let i = 0; i < rec.length; i++) {
        if (rec[i] < 0.04) continue;
        f.fillCell(i, bad[i] ? c.red : c.blue, rec[i] * (bad[i] ? 0.34 : 0.15), rec[i] * (bad[i] ? 0.8 : 0.32));
      }
      const p = f.ptr;
      const pointerIn = canHover && p.x > -500;
      const hoverAg = pointerIn ? ags.find((a) => a.life !== 'gone' && Math.hypot(f.cx(a.cell) - p.x, f.cy(a.cell) - p.y) < f.R * 1.15) : undefined;

      // finished traces fade out; the hovered agent's stay bright
      for (const t of traces) {
        const q = curve(t.x0, t.y0, t.x1, t.y1, t.bend);
        const mine = hoverAg && Math.hypot(t.x0 - f.cx(hoverAg.cell), t.y0 - f.cy(hoverAg.cell)) < 2;
        ctx.globalAlpha = hoverAg ? (mine ? 0.9 : 0.12) : (1 - t.age / 9000) * 0.5;
        ctx.strokeStyle = t.ok ? c.blue : c.red;
        ctx.lineWidth = mine ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(t.x0, t.y0);
        ctx.quadraticCurveTo(q.cx, q.cy, t.x1, t.y1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // live runs: the tracking line, then the sandbox with one arc per pipeline step
      for (const a of ags) {
        const r = a.run;
        if (!r) continue;
        const x0 = f.cx(a.cell), y0 = f.cy(a.cell), x1 = f.cx(r.target), y1 = f.cy(r.target);
        const k = r.phase === 'line' ? ease(clamp(r.t, 0, 1)) : 1;
        const q = curve(x0, y0, x1, y1, r.bend);
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -performance.now() / 60;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        const steps = 26;
        for (let s = 1; s <= steps; s++) {
          const [px, py] = q.at((s / steps) * k);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (r.phase === 'box') {
          f.ring(x1, y1, Math.min(1, r.boxT / 320), c.muted);
          const { cur, failedNow } = progress(r);
          // one arc per step, however many the pipeline has
          const n = r.steps.length, seg = 360 / n, gap = n > 1 ? 22 : 0;
          ctx.lineWidth = n > 4 ? 2.2 : 2.6;
          ctx.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const a0 = ((-90 + i * seg + gap / 2) * Math.PI) / 180, a1 = ((-90 + (i + 1) * seg - gap / 2) * Math.PI) / 180;
            const isFail = failedNow && i === r.failStep;
            ctx.strokeStyle = isFail ? c.red : i <= cur ? c.blue : c.muted;
            ctx.globalAlpha = isFail ? 1 : i < cur ? 1 : i === cur ? 0.6 + 0.4 * Math.sin(performance.now() / 160) : 0.35;
            ctx.beginPath();
            ctx.arc(x1, y1, f.R * 0.58, a0, a1);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.lineCap = 'butt'; // the dashed tracking lines and traces use the default caps
        }
      }
      for (const al of alerts) {
        const k = Math.min(1, al.t / 500), fade = al.t > 1900 ? 1 - (al.t - 1900) / 700 : 1;
        f.ring(f.cx(al.i), f.cy(al.i), k, c.red, Math.max(0, fade), 2.1);
      }
      // a new commit: a pulse around the agent
      for (const pl of pulses) {
        const k = ease(clamp(pl.t / 1100, 0, 1));
        ctx.beginPath();
        f.hex(ctx, pl.x, pl.y, f.R * (0.95 + k * 1.2));
        ctx.strokeStyle = c.blue;
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // the agents
      for (const a of ags) {
        const x = f.cx(a.cell), y = f.cy(a.cell);
        const hov = hoverAg === a;
        const born = a.life === 'new' ? ease(clamp(a.lifeT / 900, 0, 1)) : 1;
        const gone = a.life === 'gone' ? ease(clamp(a.lifeT / 1300, 0, 1)) : 0;
        const alpha = born * (1 - gone);
        if (alpha <= 0.01) continue;
        const rr = f.R * (hov ? 1.02 : 0.92);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        f.hex(ctx, x, y, rr);
        ctx.fillStyle = c.surface;
        ctx.fill();
        ctx.strokeStyle = hov ? c.blue : c.muted;
        ctx.lineWidth = hov ? 2 : 1.5;
        ctx.stroke();
        ctx.beginPath();
        f.hex(ctx, x, y, rr * 0.36);
        ctx.fillStyle = a.life === 'gone' ? c.muted : c.blue;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (a.life === 'new') f.ring(x, y, born, c.blue, 1, 2.3);
        else if (a.life === 'gone') f.ring(x, y, 1 - gone, c.muted, 1 - gone * 0.6, 2.3);
        else f.ring(x, y, a.run ? 1 : 0.85, c.muted, 0.55, 2.3);

        // label, version and state, all on a halo
        f.text(x, y + rr + 15, a.name, c.ink, alpha, BOLD, 'center', true);
        f.text(x, y + rr + 29, a.hash, a.edit > 0 ? c.blue : c.muted, alpha * 0.9, MONO, 'center', true);
        const y3 = y + rr + 46;
        if (a.life === 'gone') f.pill(x, y3, 'deleted', c.muted, alpha + 0.2);
        else if (a.tag > 0) f.pill(x, y3, 'created', c.blue, clamp(a.tag / 500, 0, 1) * alpha);
        else if (a.edit > 0) f.pill(x, y3, a.fix ? 'fix · new commit' : 'new commit', c.blue, clamp(a.edit / 500, 0, 1));
        else if (a.state === 'running') {
          const label = a.run?.phase === 'box' ? `step ${progress(a.run).cur + 1}/${a.run.steps.length}` : 'running';
          f.pill(x, y3, label, c.blue, 0.65 + 0.35 * Math.sin(performance.now() / 220));
        } else if (a.state === 'succeeded') f.pill(x, y3, 'succeeded', c.blue, alpha);
        else if (a.state === 'failed') f.pill(x, y3, 'failed', c.red, alpha);
        else f.text(x, y3, a.type.toLowerCase(), c.muted, alpha * 0.8, MONO, 'center', true);
      }

      // hover cards
      if (hoverAg) {
        const a = hoverAg;
        const prog = a.run ? progress(a.run) : null;
        const rows: { t: string; color?: string; font?: string }[] = [
          { t: a.name, color: c.ink, font: BOLD },
          { t: `${a.type} · main` },
          { t: `commit ${a.hash}`, color: c.blue },
        ];
        a.steps.forEach((s, i) => {
          const failedHere = !!prog && prog.failedNow && i === a.run!.failStep;
          const mark = prog ? (failedHere ? '✕' : i < prog.cur ? '✓' : i === prog.cur ? '▸' : '·') : a.state === 'succeeded' ? '✓' : '·';
          rows.push({ t: `${mark} 0${i + 1} ${s}`, color: failedHere ? c.red : prog && i === prog.cur ? c.blue : c.muted });
        });
        f.card(f.cx(a.cell) - 10, f.cy(a.cell) - f.R * 1.1, rows, true);
      } else if (pointerIn) {
        const i = f.nearest(p.x, p.y);
        if (i >= 0 && rec[i] > 0.12 && cellName[i] && Math.hypot(f.cx(i) - p.x, f.cy(i) - p.y) < f.R * 0.95) {
          f.card(p.x, p.y, [
            { t: cellName[i], color: c.ink, font: BOLD },
            { t: `commit ${cellHash[i]}`, color: c.blue },
            { t: bad[i] ? 'failed' : 'succeeded', color: bad[i] ? c.red : c.muted },
            { t: cellNote[i], color: bad[i] ? c.red : c.muted },
            ...(cellWas[i] ? [{ t: `was: ${cellWas[i]}`, color: c.muted }] : []),
          ]);
        }
      }
    },
  };
}
