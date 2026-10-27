// The hexagon lattice: pure geometry, with no canvas and no DOM, shared by the engine and the scene.
// Rows are offset by half a cell; cell i is at column i % cols, row floor(i / cols).
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class Grid {
  W = 0;
  H = 0;
  R = 32;
  dx = 0;
  dy = 0;
  cols = 0;
  rows = 0;
  inGrid = new Uint8Array(0);

  /** Lay the lattice out for a W x H box. `rect` ([x0, y0, x1, y1]) limits where cells exist. Returns the cells that exist. */
  build(W: number, H: number, R: number, rect: [number, number, number, number] = [0, 0, W, H]): number[] {
    this.W = W;
    this.H = H;
    this.R = R;
    this.dx = Math.sqrt(3) * R;
    this.dy = 1.5 * R;
    this.cols = Math.ceil(W / this.dx) + 2;
    this.rows = Math.ceil(H / this.dy) + 2;
    const n = this.cols * this.rows;
    const [x0, y0, x1, y1] = rect;
    this.inGrid = new Uint8Array(n);
    const cells: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = this.cx(i), y = this.cy(i);
      if (x >= x0 - R && x <= x1 + R && y >= y0 - R && y <= y1 + R) {
        this.inGrid[i] = 1;
        cells.push(i);
      }
    }
    return cells;
  }
  cx(i: number) {
    return (i % this.cols) * this.dx + ((Math.floor(i / this.cols) & 1) * this.dx) / 2 - this.dx / 2;
  }
  cy(i: number) {
    return Math.floor(i / this.cols) * this.dy;
  }
  nearest(x: number, y: number) {
    const r = clamp(Math.round(y / this.dy), 0, this.rows - 1);
    let best = -1, bd = 1e9;
    for (let dr = -1; dr <= 1; dr++) {
      const rr = r + dr;
      if (rr < 0 || rr >= this.rows) continue;
      const c0 = Math.round((x - ((rr & 1) * this.dx) / 2 + this.dx / 2) / this.dx);
      for (let dc = -1; dc <= 1; dc++) {
        const cc = c0 + dc;
        if (cc < 0 || cc >= this.cols) continue;
        const i = rr * this.cols + cc;
        const d = Math.hypot(this.cx(i) - x, this.cy(i) - y);
        if (d < bd) { bd = d; best = i; }
      }
    }
    return best;
  }
  /** random existing cell satisfying `ok` */
  pick(ok: (i: number) => boolean, tries = 300) {
    for (let k = 0; k < tries; k++) {
      const i = Math.floor(Math.random() * this.cols * this.rows);
      if (this.inGrid[i] && ok(i)) return i;
    }
    return -1;
  }
}
