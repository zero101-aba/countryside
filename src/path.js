// A* 寻路（8 方向，带转向/踩田代价），返回格坐标路径
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a; a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

export function findPath(world, sx, sy, gx, gy, opts = {}) {
  const maxNodes = opts.maxNodes || 4000;
  const w = world.w, h = world.h;
  if (!world.inBounds(gx, gy)) return null;
  if (world.tileCost(gx, gy) === Infinity) return null;
  if (sx === gx && sy === gy) return [{ x: gx, y: gy }];

  const startI = sy * w + sx;
  const goalI = gy * w + gx;
  const open = new MinHeap();
  const gScore = new Map();
  const came = new Map();
  const closed = new Set();

  const hEst = (x, y) => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
  };

  gScore.set(startI, 0);
  open.push({ i: startI, x: sx, y: sy, g: 0, f: hEst(sx, sy) });
  let nodes = 0;

  while (open.size) {
    const cur = open.pop();
    if (cur.i === goalI) {
      // 回溯
      const path = [];
      let k = goalI;
      while (k !== undefined && k !== startI) {
        path.push({ x: k % w, y: Math.floor(k / w) });
        k = came.get(k);
      }
      path.reverse();
      return path;
    }
    if (closed.has(cur.i)) continue;
    closed.add(cur.i);
    if (++nodes > maxNodes) break;

    for (const [dx, dy, dc] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (closed.has(ni)) continue;
      const tc = world.tileCost(nx, ny);
      if (tc === Infinity) continue;
      // 斜向不允许穿角
      if (dx !== 0 && dy !== 0) {
        if (world.tileCost(cur.x + dx, cur.y) === Infinity) continue;
        if (world.tileCost(cur.x, cur.y + dy) === Infinity) continue;
      }
      let step = dc * tc;
      if (tc > 1 && opts.avoidCrops !== false) step += 6; // 重度避让农田
      const ng = cur.g + step;
      if (ng < (gScore.get(ni) ?? Infinity)) {
        gScore.set(ni, ng);
        came.set(ni, cur.i);
        open.push({ i: ni, x: nx, y: ny, g: ng, f: ng + hEst(nx, ny) });
      }
    }
  }
  return null;
}

// 计算“从某点走到目标旁边”的路径：遍历候选落点，取最短路径
export function pathToNear(world, sx, sy, tx, ty, opts = {}) {
  const stands = world.standTiles(tx, ty, opts.range ?? 1);
  let best = null;
  for (const s of stands.slice(0, 8)) {
    if (world.tileCost(s.x, s.y) === Infinity) continue;
    if (s.x === sx && s.y === sy) return { path: [], stand: s };
    const p = findPath(world, sx, sy, s.x, s.y, opts);
    if (p && (!best || p.length < best.path.length)) best = { path: p, stand: s };
    if (best && best.path.length <= 1) break;
  }
  return best;
}
