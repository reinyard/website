// Engine for the hero: a hexagon field on a canvas, theme colors, a visibility-aware loop,
// an eased cursor glow, and a few drawing helpers. Each scene supplies layout/update/draw.
import { Grid, clamp } from './grid';
export { clamp };
export const ease = (t: number) => t * t * (3 - 2 * t);
// The logo's six brackets, centered on (512, 512).
const BR = [
  [297, 298, 221, 342, 221, 430],
  [727, 298, 803, 342, 803, 430],
  [221, 594, 221, 682, 297, 726],
  [803, 594, 803, 682, 727, 726],
  [435, 220, 512, 176, 589, 220],
  [435, 804, 512, 848, 589, 804],
];

export type Colors = { cell: string; blue: string; muted: string; ink: string; red: string; surface: string; line: string; bg: string };
export interface Scene {
  layout?(): void;
  update(dt: number): void;
  draw(): void;
  /** reduced motion: finish anything in flight so the still frame shows results, not a half-drawn run */
  settle?(): void;
}

export class Field extends Grid {
  ctx: CanvasRenderingContext2D;
  // the lattice never changes between frames, so it lives on its own layer, drawn only on resize and theme change
  private grid: HTMLCanvasElement;
  private gctx: CanvasRenderingContext2D;
  base = new Path2D();
  glow = new Float32Array(0);
  c: Colors = { cell: '', blue: '', muted: '', ink: '', red: '', surface: '', line: '', bg: '' };
  reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ptr = { x: -999, y: -999, tx: -999, ty: -999 };
  scene!: Scene;
  private visible = true;
  private running = false;
  private raf = 0;
  private last = 0;

  /** gridRect returns [x0, y0, x1, y1] in CSS px: where cells exist. Defaults to the whole canvas. */
  constructor(
    public canvas: HTMLCanvasElement,
    make: (f: Field) => Scene,
    private opts: { R?: number; gridRect?: (f: Field) => [number, number, number, number] } = {},
  ) {
    super();
    this.ctx = canvas.getContext('2d')!;
    this.grid = document.createElement('canvas');
    this.grid.setAttribute('aria-hidden', 'true');
    this.grid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-2;opacity:0;transition:opacity .9s cubic-bezier(.22,1,.36,1)';
    canvas.before(this.grid);
    this.gctx = this.grid.getContext('2d')!;
    this.scene = make(this);
    this.layout();
    if (this.reduce) {
      this.simulate();
      this.render();
    } else this.play();

    new ResizeObserver(() => {
      this.layout();
      if (this.reduce) this.simulate(); // a layout resets the scene, so rebuild the static frame
      if (!this.running) this.render();
    }).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.visible ? this.play() : this.stop();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.play()));
    new MutationObserver(() => {
      this.readColors();
      this.drawGrid();
      if (!this.running) this.render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener(
      'pointermove',
      (e) => {
        // the glow follows a mouse only: on a touch screen it would stay pinned where the last finger landed
        if (e.pointerType !== 'mouse') return;
        const b = canvas.getBoundingClientRect();
        this.ptr.tx = e.clientX - b.left;
        this.ptr.ty = e.clientY - b.top;
        if (this.ptr.ty < -120 || this.ptr.ty > b.height + 120) this.ptr.tx = -999;
      },
      { passive: true },
    );
    document.documentElement.addEventListener('mouseleave', () => (this.ptr.tx = -999));
  }

  /** reduced motion: advance the scene without animating, to land on a populated still frame */
  private simulate() {
    for (let k = 0; k < 260; k++) this.scene.update(50);
    this.scene.settle?.();
  }

  readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    this.c = { cell: g('--cell'), blue: g('--blue'), muted: g('--muted'), ink: g('--ink'), red: g('--red'), surface: g('--bg-2'), line: g('--line'), bg: g('--bg') };
  }
  hex(p: Path2D | CanvasRenderingContext2D, x: number, y: number, r: number) {
    for (let k = 0; k < 6; k++) {
      const a = ((60 * k - 90) * Math.PI) / 180;
      const qx = x + r * Math.cos(a), qy = y + r * Math.sin(a);
      k ? p.lineTo(qx, qy) : p.moveTo(qx, qy);
    }
    p.closePath();
  }
  layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
    this.canvas.width = this.grid.width = Math.round(this.W * dpr);
    this.canvas.height = this.grid.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = this.W < 640 ? 22 : this.opts.R ?? 32;
    // the lattice is built first (cols/rows are needed to size the glow buffer), then the cell outlines are traced
    const cells = this.build(this.W, this.H, R, this.opts.gridRect ? this.opts.gridRect(this) : undefined);
    this.glow = new Float32Array(this.cols * this.rows);
    this.base = new Path2D();
    for (const i of cells) this.hex(this.base, this.cx(i), this.cy(i), this.R);
    this.readColors();
    this.drawGrid();
    this.scene.layout?.();
  }

  private drawGrid() {
    const g = this.gctx;
    g.clearRect(0, 0, this.W, this.H);
    g.lineWidth = 1;
    g.strokeStyle = this.c.cell;
    g.stroke(this.base);
    requestAnimationFrame(() => (this.grid.style.opacity = '1'));
  }

  /** eased cursor + glow decay; scenes call this from update() */
  warm(dt: number) {
    const p = this.ptr;
    if (p.tx > -500) {
      if (p.x < -500) { p.x = p.tx; p.y = p.ty; }
      const k = 1 - Math.pow(0.001, dt / 1000);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      const r = 120;
      for (let rr = Math.max(0, Math.floor((p.y - r) / this.dy)); rr <= Math.min(this.rows - 1, Math.ceil((p.y + r) / this.dy)); rr++)
        for (let cc = 0; cc < this.cols; cc++) {
          const i = rr * this.cols + cc;
          if (!this.inGrid[i]) continue;
          const d = Math.hypot(this.cx(i) - p.x, this.cy(i) - p.y);
          if (d < r) this.glow[i] = Math.max(this.glow[i], (1 - d / r) ** 2 * 0.55);
        }
    } else p.x = -999;
    const decay = Math.pow(0.5, dt / 650);
    for (let i = 0; i < this.glow.length; i++) this.glow[i] *= decay;
  }

  // ---- drawing helpers ----
  /** the logo's brackets around (x, y); k: 0 = open, 1 = closed */
  ring(x: number, y: number, k: number, color: string, alpha = 1, size = 1.85) {
    const { ctx, R } = this;
    const s = ((R * size) / 680) * (1.16 - 0.16 * ease(clamp(k, 0, 1)));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha * (0.3 + 0.7 * clamp(k, 0, 1));
    ctx.lineWidth = Math.max(1.5, 60 * s);
    ctx.beginPath();
    for (const b of BR) {
      ctx.moveTo(x + (b[0] - 512) * s, y + (b[1] - 512) * s);
      ctx.lineTo(x + (b[2] - 512) * s, y + (b[3] - 512) * s);
      ctx.lineTo(x + (b[4] - 512) * s, y + (b[5] - 512) * s);
    }
    ctx.stroke();
    ctx.restore();
  }
  fillCell(i: number, color: string, a: number, strokeA: number) {
    const { ctx } = this;
    ctx.beginPath();
    this.hex(ctx, this.cx(i), this.cy(i), this.R - 1);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = a;
    ctx.fill();
    ctx.globalAlpha = strokeA;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  /** small status pill centered on (x, y), like the app's tags */
  pill(x: number, y: number, label: string, color: string, alpha = 1, mono = true) {
    const { ctx } = this;
    ctx.save();
    ctx.font = mono ? "500 9.5px 'IBM Plex Mono', ui-monospace, monospace" : "600 11px 'IBM Plex Sans', system-ui, sans-serif";
    const w = ctx.measureText(label).width + 14, h = 17;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 5);
    ctx.fillStyle = this.c.surface;
    ctx.fill();
    ctx.globalAlpha = alpha * 0.16;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
  }
  text(x: number, y: number, s: string, color: string, alpha = 1, font = "600 12px 'IBM Plex Sans', system-ui, sans-serif", align: CanvasTextAlign = 'center', halo = false) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (halo) {
      // a page-colored outline so lines and cells never cut through the text
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = this.c.bg;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  /** a small info card near (x, y), like the app's tags and headers */
  card(x: number, y: number, rows: { t: string; color?: string; font?: string }[], above = false) {
    const { ctx } = this;
    ctx.save();
    const pad = 10, lh = 17;
    let w = 0;
    for (const r of rows) {
      ctx.font = r.font ?? "500 11px 'IBM Plex Mono', monospace";
      w = Math.max(w, ctx.measureText(r.t).width);
    }
    w += pad * 2;
    const h = rows.length * lh + pad * 2 - 4;
    let cx0 = x + 16, cy0 = above ? y - h - 18 : y + 14;
    if (cx0 + w > this.W - 8) cx0 = x - w - 16;
    if (cy0 + h > this.H - 8) cy0 = y - h - 14;
    if (cy0 < 8) cy0 = y + 18;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.roundRect(cx0, cy0, w, h, 8);
    ctx.fillStyle = this.c.surface;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = this.c.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    rows.forEach((r, i) => {
      ctx.font = r.font ?? "500 11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = r.color ?? this.c.muted;
      ctx.fillText(r.t, cx0 + pad, cy0 + pad + 4 + i * lh);
    });
    ctx.restore();
  }

  private render() {
    const { ctx, c } = this;
    ctx.clearRect(0, 0, this.W, this.H);
    for (let i = 0; i < this.glow.length; i++) {
      const g = this.glow[i];
      if (g < 0.03) continue;
      this.fillCell(i, c.blue, g * 0.2, Math.min(1, g * 0.7));
    }
    this.scene.draw();
  }
  private play() {
    if (this.reduce || this.running || !this.visible || document.hidden) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.tick);
  }
  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf); // a frame already queued must not survive into the next play()
  }
  private tick = (t: number) => {
    if (!this.running) return;
    const dt = this.last ? Math.min(48, t - this.last) : 16;
    this.last = t;
    this.scene.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };
}
