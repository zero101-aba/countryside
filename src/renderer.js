// 渲染：低分辨率缓冲 + 整数像素 + 昼夜光照
import { C, CROPS, TILE, MAP_W, MAP_H, SEASON_EN } from './config.js';
import { SpriteBank, EMO } from './sprites.js';
import { rnd } from './world.js';

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function hex(c) {
  if (Array.isArray(c)) return c;
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb(a) { return `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`; }

export class Renderer {
  constructor(canvas, world, sim) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.sim = sim;
    this.sprites = new SpriteBank();
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.scale = 2;
    this.cam = { x: 17, y: 12 };
    this.camTarget = { x: 17, y: 12 };
    this.time = 0;
    this.effects = [];
    this.tileCache = this._buildTiles();
    this.structCache = new Map();
    this.treeCache = new Map();
    this.avatarCache = new Map();
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(280, rect.width);
    this.cssH = Math.max(240, rect.height);
    // 位图固定 1:1 CSS 像素：低分辨率缓冲负责“像素放大”，
    // 这样不会出现 DPR 与 drawImage 重复缩放导致的错位。
    this.dpr = 1;
    this.canvas.width = Math.round(this.cssW);
    this.canvas.height = Math.round(this.cssH);
    this.scale = this._pickScale();
    this.bufW = Math.ceil(this.cssW / this.scale);
    this.bufH = Math.ceil(this.cssH / this.scale);
    this.buf.width = this.bufW;
    this.buf.height = this.bufH;
    this.bctx = this.buf.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;
    this._clampCam();
  }

  _pickScale() {
    // 视野：较宽的镜头，手机竖屏约能看到 12~13 格高度
    return Math.max(1.3, Math.min(2.6, this.cssH / (TILE * 13.5)));
  }

  setZoom(delta) {
    this.scale = Math.max(1.3, Math.min(3.4, this.scale + delta));
    this.bufW = Math.ceil(this.cssW / this.scale);
    this.bufH = Math.ceil(this.cssH / this.scale);
    this.buf.width = this.bufW;
    this.buf.height = this.bufH;
    this.bctx.imageSmoothingEnabled = false;
    this._clampCam();
  }

  // ---------- 摄像机 ----------
  focusOn(wx, wy, snap = false) {
    this.camTarget.x = wx;
    this.camTarget.y = wy;
    if (snap) { this.cam.x = wx; this.cam.y = wy; this._clampCam(); }
  }

  // 立即定位（用于进入选目标阶段，避免点击瞬间镜头还在滑动）
  snapTo(wx, wy) {
    this.camTarget.x = wx;
    this.camTarget.y = wy;
    this.cam.x = wx;
    this.cam.y = wy;
    this._clampCam();
    // 夹取后同步目标，避免随后又被拉回去
    this.camTarget.x = this.cam.x;
    this.camTarget.y = this.cam.y;
  }

  _clampCam() {
    const halfW = this.bufW / (2 * TILE), halfH = this.bufH / (2 * TILE);
    const maxX = MAP_W - halfW, maxY = MAP_H - halfH;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (maxX < halfW) this.cam.x = MAP_W / 2;
    else this.cam.x = clamp(this.cam.x, halfW, maxX);
    if (maxY < halfH) this.cam.y = MAP_H / 2;
    else this.cam.y = clamp(this.cam.y, halfH, maxY);
  }

  // 世界坐标（格）↔ 屏幕坐标（CSS 像素）：一格 = TILE * scale 像素
  screenToWorld(sx, sy) {
    const k = TILE * this.scale;
    return {
      x: this.cam.x + (sx - this.cssW / 2) / k,
      y: this.cam.y + (sy - this.cssH / 2) / k,
    };
  }

  worldToScreen(wx, wy) {
    const k = TILE * this.scale;
    return {
      x: (wx - this.cam.x) * k + this.cssW / 2,
      y: (wy - this.cam.y) * k + this.cssH / 2,
    };
  }

  // ---------- 图块缓存 ----------
  _buildTiles() {
    const out = {};
    const mk = (type, v) => {
      const c = document.createElement('canvas');
      c.width = TILE; c.height = TILE;
      const x = c.getContext('2d');
      const r = mulberry(hash(type * 7 + v * 131));
      if (type === 0) {
        this._grass(x, r, v);
      } else if (type === 1) {
        x.fillStyle = C.dirt; x.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 26; i++) {
          x.fillStyle = r() < 0.5 ? C.dirt2 : C.dirt3;
          x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 2, 2);
        }
        x.fillStyle = C.dirt2;
        for (let i = 0; i < 6; i++) x.fillRect(0, Math.floor(r() * TILE), TILE, 1);
      } else if (type === 2) {
        x.fillStyle = C.path; x.fillRect(0, 0, TILE, TILE);
        x.fillStyle = C.path2;
        for (let i = 0; i < 14; i++) {
          x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 3, 2);
        }
        // 边缘石块
        x.fillStyle = '#a98d62';
        if (r() < 0.5) x.fillRect(Math.floor(r() * 20), Math.floor(r() * 20), 4, 3);
      } else if (type === 3) {
        x.fillStyle = C.water; x.fillRect(0, 0, TILE, TILE);
        x.fillStyle = C.water2;
        for (let i = 0; i < 8; i++) {
          x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 8, 2);
        }
        x.fillStyle = C.waterDeep;
        for (let i = 0; i < 4; i++) x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 5, 1);
      } else if (type === 4) {
        x.fillStyle = C.sand; x.fillRect(0, 0, TILE, TILE);
        x.fillStyle = C.sand2;
        for (let i = 0; i < 18; i++) x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 2, 2);
      } else if (type === 5) {
        x.fillStyle = '#6e4a2e'; x.fillRect(0, 0, TILE, TILE);
        x.fillStyle = '#7d5636'; x.fillRect(1, 1, TILE - 2, TILE - 2);
        x.fillStyle = '#8a6039';
        x.fillRect(2, 3, TILE - 4, 1);
        x.fillRect(2, 10, TILE - 4, 1);
        x.fillRect(2, 17, TILE - 4, 1);
      } else if (type === 6) {
        // 石砖广场
        x.fillStyle = '#9a8f7c'; x.fillRect(0, 0, TILE, TILE);
        const stones = [
          [1, 1, 10, 7], [12, 1, 11, 7], [1, 9, 7, 6], [9, 9, 6, 6], [16, 9, 7, 6],
          [1, 16, 12, 7], [14, 16, 9, 7],
        ];
        for (let i = 0; i < stones.length; i++) {
          const [sx, sy, sw, sh] = stones[i];
          x.fillStyle = i % 2 ? '#b3a894' : '#aa9f8b';
          x.fillRect(sx, sy, sw, sh);
          x.fillStyle = '#c2b8a4';
          x.fillRect(sx, sy, sw, 1);
          x.fillStyle = '#8a7f6c';
          x.fillRect(sx, sy + sh - 1, sw, 1);
        }
      }
      return c;
    };
    for (const t of [0, 1, 2, 3, 4, 5, 6]) {
      out[t] = [];
      for (let v = 0; v < 4; v++) out[t].push(mk(t, v));
    }
    return out;
  }

  _grass(x, r, v) {
    x.fillStyle = C.grass; x.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 20; i++) {
      x.fillStyle = r() < 0.5 ? C.grass2 : C.grass3;
      x.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), 2, 2);
    }
    x.fillStyle = C.grassDark;
    for (let i = 0; i < 4; i++) {
      const bx = Math.floor(r() * (TILE - 3)), by = Math.floor(r() * (TILE - 4));
      x.fillRect(bx, by, 1, 3);
      x.fillRect(bx + 2, by + 1, 1, 2);
    }
    if (v === 3 && r() < 0.5) {
      x.fillStyle = '#f4e04e';
      x.fillRect(6 + Math.floor(r() * 10), 6 + Math.floor(r() * 10), 2, 2);
      x.fillStyle = '#e8a0b8';
      x.fillRect(10 + Math.floor(r() * 8), 12 + Math.floor(r() * 6), 2, 2);
    }
  }

  // ---------- 主渲染 ----------
  render(dt) {
    this.time += dt;
    const sim = this.sim;
    // 摄像机缓动
    const k = 1 - Math.pow(0.0015, dt);
    this.cam.x += (this.camTarget.x - this.cam.x) * k;
    this.cam.y += (this.camTarget.y - this.cam.y) * k;
    this._clampCam();

    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.imageSmoothingEnabled = false;
    b.fillStyle = '#20301c';
    b.fillRect(0, 0, this.bufW, this.bufH);

    const ox = Math.round(this.bufW / 2 - this.cam.x * TILE);
    const oy = Math.round(this.bufH / 2 - this.cam.y * TILE);
    b.setTransform(1, 0, 0, 1, ox, oy);

    this._drawGround(b);
    this._drawRegionTint(b);
    this._drawPlots(b);
    this._drawTargetHints(b);
    this._updateEffects(dt);
    this._drawGroundItems(b);

    // 建筑与树：按底边排序（固定图层，村民永远画在上面，走过屋顶时半透明）
    const solids = [];
    for (const s of this.world.structures) {
      if (s.type === 'dock') continue;
      solids.push({ y: s.type === 'market' ? s.y + 1.4 : s.y + s.h + (s.type === 'sign' ? 0.2 : 0), draw: () => this._drawStruct(b, s) });
    }
    for (const t of this.world.trees) {
      solids.push({ y: t.y + 1, draw: () => this._drawTree(b, t) });
    }
    for (const r of this.world.rocks) solids.push({ y: r.y + 0.9, draw: () => this._drawRock(b, r) });
    for (const key of this.world.fences) {
      const [fx, fy] = key.split(',').map(Number);
      solids.push({ y: fy + 0.9, draw: () => this._drawFence(b, fx, fy) });
    }
    for (const p of this.world.props) solids.push({ y: p.y + 0.92, draw: () => this._drawProp(b, p) });
    for (const a of this.world.animals) solids.push({ y: a.y + 0.2, draw: () => this._drawAnimal(b, a) });
    solids.sort((a, c) => a.y - c.y);
    for (const it of solids) it.draw();

    // 村民：始终可见（被屋顶/树冠遮住时降低不透明度）
    const vs = sim.villagers.slice().sort((a, c) => a.y - c.y);
    for (const v of vs) this._drawVillager(b, v);
    this._drawSleepMarks(b);

    this._drawEffects(b);
    this._drawNight(b);
    this._drawSeasons(b);
    this._drawWeather(b);

    // 放大到屏幕
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buf, 0, 0, this.bufW, this.bufH, 0, 0, this.bufW * this.scale, this.bufH * this.scale);
  }

  _drawRegionTint(b) {
    const r = this.sim.regionAt(this.cam.x, this.cam.y);
    const col = { forest: 'rgba(30,60,40,0.10)', river: 'rgba(40,80,90,0.06)', fishing: 'rgba(40,90,85,0.05)' }[r.id];
    if (!col) return;
    b.fillStyle = col;
    b.fillRect(0, 0, this.bufW, this.bufH);
  }

  _drawGround(b) {
    const x0 = Math.max(0, Math.floor(this.cam.x - this.bufW / (2 * TILE)) - 1);
    const x1 = Math.min(MAP_W - 1, Math.ceil(this.cam.x + this.bufW / (2 * TILE)) + 1);
    const y0 = Math.max(0, Math.floor(this.cam.y - this.bufH / (2 * TILE)) - 1);
    const y1 = Math.min(MAP_H - 1, Math.ceil(this.cam.y + this.bufH / (2 * TILE)) + 1);
    const w = this.world;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = w.tiles[y * w.w + x];
        const v = w.variant[y * w.w + x];
        b.drawImage(this.tileCache[t][v], x * TILE, y * TILE);
      }
    }
    // 水面波光
    const t = this.time;
    b.fillStyle = C.waterLight;
    for (let i = 0; i < w.waters.length; i++) {
      const [x, y] = w.waters[i];
      if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
      const ph = (i * 0.7 + t * 1.2) % 3;
      if (ph < 1) {
        b.globalAlpha = 0.55 - ph * 0.4;
        b.fillRect(x * TILE + 4, y * TILE + 10 + Math.round(Math.sin(t + i) * 2), 9, 1);
        b.globalAlpha = 1;
      }
    }
    // 采样点
    for (const d of w.decor) {
      if (d.x < x0 || d.x > x1 + 1 || d.y < y0 || d.y > y1 + 1) continue;
      const px = Math.round(d.x * TILE), py = Math.round(d.y * TILE);
      if (d.kind === 'tuft') {
        b.fillStyle = C.grassDark;
        b.fillRect(px, py, 1, 3);
        b.fillRect(px + 2, py + 1, 1, 2);
      } else {
        b.fillStyle = '#9a9a8a';
        b.fillRect(px, py, 2, 1);
      }
    }
    for (const f of w.flowers) {
      if (f.x < x0 || f.x > x1 + 1 || f.y < y0 || f.y > y1 + 1) continue;
      const px = Math.round(f.x * TILE), py = Math.round(f.y * TILE);
      b.fillStyle = f.c;
      b.fillRect(px, py, 2, 2);
      b.fillStyle = '#5f8a4a';
      b.fillRect(px + 1, py + 2, 1, 2);
    }
  }

  // 当前指令模式下，把所有合法目标框出来
  _drawTargetHints(b) {
    const mode = this.sim.pickMode;
    if (!mode) return;
    const sim = this.sim;
    const pulse = (Math.sin(this.time * 5) + 1) / 2;
    b.lineWidth = 1.5;
    b.strokeStyle = `rgba(255,226,120,${0.45 + pulse * 0.45})`;
    const cells = [];
    if (mode === 'chop') {
      for (const t of this.world.trees) if (t.regrowAt <= sim.absHours) cells.push([t.x, t.y]);
    } else {
      for (const p of this.world.plots) {
        if (mode === 'plow' && p.state === 'grass') cells.push([p.x, p.y]);
        else if (mode === 'plant' && p.state === 'plowed' && !p.crop) cells.push([p.x, p.y]);
        else if (mode === 'water' && p.state === 'plowed' && !sim.isWet(p)) cells.push([p.x, p.y]);
        else if (mode === 'harvest' && sim.cropReady(p)) cells.push([p.x, p.y]);
      }
    }
    for (const [x, y] of cells) {
      b.strokeRect(x * TILE + 1.5, y * TILE + 1.5, TILE - 3, TILE - 3);
    }
  }

  _drawPlots(b) {
    const sim = this.sim;
    for (const p of this.world.plots) {
      const x = p.x * TILE, y = p.y * TILE;
      // 耕地
      if (p.state === 'plowed') {
        const wet = sim.isWet(p);
        b.fillStyle = '#5a3a22';
        b.fillRect(x + 1, y + 2, TILE - 2, TILE - 4);
        b.fillStyle = wet ? '#4a2f1c' : '#7a5232';
        b.fillRect(x + 2, y + 3, TILE - 4, TILE - 6);
        b.fillStyle = wet ? '#3f2716' : '#68452a';
        for (let i = 0; i < 4; i++) b.fillRect(x + 4, y + 6 + i * 4, TILE - 8, 1);
        // 垄边高光
        b.fillStyle = wet ? '#5e3d26' : '#966a42';
        b.fillRect(x + 2, y + 3, TILE - 4, 1);
        b.fillRect(x + 2, y + 3, 1, TILE - 6);
        // 圆角：补回草色
        b.fillStyle = C.grass;
        b.fillRect(x + 1, y + 2, 2, 2);
        b.fillRect(x + TILE - 3, y + 2, 2, 2);
        b.fillRect(x + 1, y + TILE - 3, 2, 2);
        b.fillRect(x + TILE - 3, y + TILE - 3, 2, 2);
        if (wet) {
          b.globalAlpha = 0.22;
          b.fillStyle = '#1f1208';
          b.fillRect(x + 3, y + 4, TILE - 6, 3);
          b.globalAlpha = 1;
        }
        // 土壤颗粒
        b.fillStyle = wet ? '#6a4a30' : '#a8784a';
        b.fillRect(x + 5, y + 9, 2, 1);
        b.fillRect(x + TILE - 8, y + 15, 2, 1);
        b.fillRect(x + 10, y + 19, 1, 1);
      } else {
        b.fillStyle = C.grass2;
        b.globalAlpha = 0.55;
        b.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        b.globalAlpha = 1;
        b.strokeStyle = 'rgba(60,50,30,0.18)';
        b.strokeRect(x + 1.5, y + 2.5, TILE - 3, TILE - 4);
      }
      if (p.crop) this._drawCrop(b, p, sim);
      // 缺水提示
      if (p.crop && !sim.isWet(p) && !sim.cropReady(p)) {
        const bob = Math.sin(this.time * 3 + p.id) * 1;
        b.fillStyle = '#5ab8e0';
        b.fillRect(x + TILE - 6, y + 1 + Math.round(bob), 2, 4);
        b.fillRect(x + TILE - 7, y + 5 + Math.round(bob), 4, 2);
      }
      // 成熟提示
      if (sim.cropReady(p)) {
        const tw = (Math.sin(this.time * 4 + p.id * 2) + 1) / 2;
        b.fillStyle = '#fff3c0';
        b.globalAlpha = 0.5 + tw * 0.5;
        b.fillRect(x + TILE - 5, y + 2, 2, 2);
        b.fillRect(x + TILE - 8, y + 4, 1, 1);
        b.globalAlpha = 1;
      }
    }
  }

  _drawCrop(b, p, sim) {
    const c = CROPS[p.crop];
    if (!c) return;
    const x = p.x * TILE, y = p.y * TILE;
    const prog = sim.cropProgress(p);
    const sway = Math.round(Math.sin(this.time * 2 + p.x * 1.3 + p.y) * 1.5);
    const cx = x + TILE / 2;
    const leaf = (lx, ly, w, h, col) => { b.fillStyle = col || C.leaf; b.fillRect(lx, ly, w, h); };

    // 幼苗：两片小叶
    if (prog < 0.2) {
      b.fillStyle = C.leaf2;
      b.fillRect(cx - 0.5, y + 14, 1, 4);
      leaf(cx - 4, y + 12, 4, 2, C.leaf3);
      leaf(cx + 1, y + 12, 4, 2, C.leaf3);
      return;
    }

    // 生长期：茎 + 逐渐变多的叶子
    b.fillStyle = C.leaf2;
    b.fillRect(cx - 0.5, y + 9, 1.5, 10);
    const leaves = prog < 0.45 ? 2 : prog < 0.75 ? 4 : 5;
    const pts = [
      [cx - 6, y + 12 + sway, 5, 3], [cx + 2, y + 11 - sway, 5, 3],
      [cx - 7, y + 16 - sway, 4, 3], [cx + 3, y + 15 + sway, 4, 3],
      [cx - 4, y + 8 + sway, 3, 2],
    ];
    for (let i = 0; i < leaves; i++) {
      const [lx, ly, lw, lh] = pts[i];
      leaf(lx, ly, lw, lh, i % 2 ? C.leaf : C.leaf3);
    }
    if (prog < 0.45) return;

    // 开花/结苞
    if (prog < 0.8) {
      b.fillStyle = shade(c.color, 0.15);
      b.fillRect(cx - 1.5, y + 7 + sway, 3, 3);
      b.fillStyle = '#fff6dc';
      b.fillRect(cx - 0.5, y + 7 + sway, 1, 1);
      // 未成熟的小果
      b.fillStyle = c.color;
      b.globalAlpha = 0.75;
      b.fillRect(cx - 4, y + 15, 3, 3);
      b.globalAlpha = 1;
      return;
    }

    // 成熟：按作物画不同形状
    const crop = p.crop;
    if (crop === 'radish') {
      // 萝卜：绿叶 + 白胖根 + 粉红顶
      leaf(cx - 5, y + 6, 3, 4, C.leaf);
      leaf(cx - 1, y + 4, 3, 5, C.leaf3);
      leaf(cx + 3, y + 6, 3, 4, C.leaf);
      b.fillStyle = '#f6efdd';
      b.fillRect(cx - 4, y + 12, 8, 7);
      b.fillRect(cx - 3, y + 11, 6, 1);
      b.fillRect(cx - 5, y + 13, 1, 4);
      b.fillRect(cx + 4, y + 13, 1, 4);
      b.fillStyle = '#e46f8a';
      b.fillRect(cx - 3, y + 11, 6, 2);
      b.fillStyle = '#ffffff';
      b.fillRect(cx - 2, y + 14, 2, 2);
      b.fillStyle = '#d8cbb4';
      b.fillRect(cx - 1, y + 19, 3, 2);
    } else if (crop === 'turnip') {
      leaf(cx - 6, y + 5, 4, 4, C.leaf);
      leaf(cx - 1, y + 3, 3, 5, C.leaf3);
      leaf(cx + 3, y + 6, 4, 3, C.leaf);
      b.fillStyle = '#f4ecd8';
      b.fillRect(cx - 4, y + 13, 8, 6);
      b.fillRect(cx - 3, y + 12, 6, 1);
      b.fillStyle = '#8a5ab8';
      b.fillRect(cx - 4, y + 10, 8, 4);
      b.fillStyle = '#a87ac8';
      b.fillRect(cx - 2, y + 9, 4, 2);
      b.fillStyle = '#ffffff';
      b.fillRect(cx - 1, y + 15, 2, 2);
    } else if (crop === 'carrot') {
      // 胡萝卜：羽状叶 + 橙色锥根
      for (let i = -2; i <= 2; i++) {
        b.fillStyle = i % 2 ? C.leaf : C.leaf3;
        b.fillRect(cx + i * 2, y + 6 + Math.abs(i), 1, 8);
        b.fillRect(cx + i * 2 - 1, y + 5 + Math.abs(i), 3, 2);
      }
      b.fillStyle = '#e8823c';
      b.fillRect(cx - 3, y + 13, 6, 6);
      b.fillRect(cx - 2, y + 19, 4, 2);
      b.fillRect(cx - 1, y + 21, 2, 1);
      b.fillStyle = '#f2a05a';
      b.fillRect(cx - 2, y + 14, 2, 2);
      b.fillStyle = '#c86a2a';
      b.fillRect(cx + 2, y + 15, 1, 3);
    } else if (crop === 'strawberry') {
      // 草莓：低矮叶丛 + 红果 + 白花
      b.fillStyle = C.leaf2;
      b.fillRect(cx - 7, y + 14, 14, 5);
      for (let i = 0; i < 5; i++) {
        leaf(cx - 8 + i * 3, y + 11 + (i % 2) * 2, 4, 3, i % 2 ? C.leaf : C.leaf3);
      }
      for (const [bx, by] of [[-5, 16], [0, 14], [4, 17]]) {
        b.fillStyle = '#d84a4a';
        b.fillRect(cx + bx, y + by, 3, 3);
        b.fillStyle = '#f06a5a';
        b.fillRect(cx + bx + 1, y + by, 1, 1);
        b.fillStyle = '#ffe08a';
        b.fillRect(cx + bx + 2, y + by + 1, 1, 1);
      }
      b.fillStyle = '#fff6dc';
      b.fillRect(cx - 2, y + 8, 2, 2);
      b.fillRect(cx + 4, y + 9, 2, 2);
      b.fillStyle = '#f4d84a';
      b.fillRect(cx - 2, y + 8, 1, 1);
    } else if (crop === 'pumpkin') {
      // 南瓜：藤蔓 + 大果
      b.fillStyle = C.leaf2;
      b.fillRect(cx - 9, y + 15, 18, 4);
      leaf(cx - 6, y + 10, 5, 3, C.leaf);
      leaf(cx + 2, y + 9, 4, 3, C.leaf3);
      b.fillStyle = '#e8823c';
      b.fillRect(cx - 7, y + 12, 14, 9);
      b.fillRect(cx - 6, y + 11, 12, 1);
      b.fillRect(cx - 8, y + 13, 1, 7);
      b.fillRect(cx + 7, y + 13, 1, 7);
      b.fillStyle = '#c86a2a';
      b.fillRect(cx - 3, y + 12, 1, 9);
      b.fillRect(cx + 2, y + 12, 1, 9);
      b.fillStyle = '#f2a05a';
      b.fillRect(cx - 5, y + 13, 2, 2);
      b.fillStyle = '#5f8a3a';
      b.fillRect(cx - 1, y + 9, 2, 3);
    } else {
      // 兜底：原来的果实
      b.fillStyle = c.color;
      b.fillRect(cx - 4, y + 12, 8, 7);
      b.fillStyle = shade(c.color, 0.2);
      b.fillRect(cx - 3, y + 12, 2, 2);
    }
  }
  _drawGroundItems(b) {
    // 采集物
    for (const f of this.world.forages) {
      if (f.taken) continue;
      const x = f.x * TILE, y = f.y * TILE;
      if (f.kind === 'mushroom') {
        b.fillStyle = '#e8e0c8';
        b.fillRect(x + 10, y + 15, 3, 5);
        b.fillStyle = '#c25b4e';
        b.fillRect(x + 7, y + 12, 9, 4);
        b.fillRect(x + 9, y + 10, 5, 3);
        b.fillStyle = '#f4e8d0';
        b.fillRect(x + 9, y + 12, 2, 2);
      } else {
        b.fillStyle = '#b03a4a';
        b.fillRect(x + 9, y + 15, 2, 2);
        b.fillRect(x + 12, y + 13, 2, 2);
        b.fillRect(x + 14, y + 16, 2, 2);
        b.fillStyle = C.leaf;
        b.fillRect(x + 8, y + 13, 3, 2);
        b.fillRect(x + 13, y + 17, 3, 2);
      }
    }
  }

  // ---------- 建筑 ----------
  _drawStruct(b, s) {
    if (s.type === 'house' || s.type === 'shed') this._drawHouse(b, s);
    else if (s.type === 'market') this._drawMarket(b, s);
    else if (s.type === 'well') this._drawWell(b, s);
    else if (s.type === 'sign') this._drawSign(b, s);
    else if (s.type === 'barn') this._drawBarn(b, s);
    else if (s.type === 'windmill') this._drawWindmill(b, s);
    else if (s.type === 'mine') this._drawMine(b, s);
  }

  _drawMine(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const w = s.w * TILE, h = s.h * TILE;
    // 山体
    b.fillStyle = '#5a5a62';
    b.beginPath();
    b.moveTo(x - 4, y + h);
    b.lineTo(x + 4, y + 4);
    b.lineTo(x + w - 4, y + 4);
    b.lineTo(x + w + 4, y + h);
    b.closePath();
    b.fill();
    b.fillStyle = '#6e6e78';
    b.beginPath();
    b.moveTo(x + 2, y + h);
    b.lineTo(x + 8, y + 8);
    b.lineTo(x + w - 10, y + 8);
    b.lineTo(x + w - 2, y + h);
    b.closePath();
    b.fill();
    // 洞口
    b.fillStyle = '#141016';
    b.beginPath();
    b.ellipse(x + w / 2, y + h - 4, w * 0.32, h * 0.42, 0, Math.PI, Math.PI * 2);
    b.fill();
    b.fillRect(x + w / 2 - w * 0.32, y + h - 4, w * 0.64, 6);
    // 木支架
    b.fillStyle = '#6b4526';
    b.fillRect(x + 4, y + h - 18, 3, 18);
    b.fillRect(x + w - 7, y + h - 18, 3, 18);
    b.fillRect(x + 3, y + h - 20, w - 6, 3);
    // 矿脉
    b.fillStyle = '#e8c060';
    b.fillRect(x + 8, y + 12, 2, 2);
    b.fillRect(x + w - 12, y + 16, 2, 2);
    b.fillStyle = '#8fd8f0';
    b.fillRect(x + w - 16, y + 10, 2, 1);
  }

  _drawBarn(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const w = s.w * TILE, h = s.h * TILE;
    const roofH = Math.round(h * 0.52);
    const wallTop = y + roofH;
    const wallH = h - roofH;
    b.fillStyle = 'rgba(20,30,15,0.2)';
    b.fillRect(x - 2, y + h - 3, w + 4, 5);
    // 墙
    b.fillStyle = '#a8683f';
    b.fillRect(x + 2, wallTop, w - 4, wallH);
    b.fillStyle = '#8f5533';
    for (let i = 0; i < wallH; i += 6) b.fillRect(x + 3, wallTop + i, w - 6, 1);
    b.fillStyle = 'rgba(0,0,0,0.12)';
    b.fillRect(x + w - 9, wallTop, 7, wallH);
    // 大门
    const dW = 30, dH = Math.min(wallH - 12, 20);
    const dx = s.door * TILE + TILE / 2 - dW / 2;
    const dy = y + h - dH - 2;
    b.fillStyle = '#5f3f26';
    b.fillRect(dx - 2, dy - 2, dW + 4, dH + 2);
    b.fillStyle = '#8a5c35';
    b.fillRect(dx, dy, dW, dH);
    b.fillStyle = '#a97a4a';
    b.fillRect(dx + 2, dy + 2, dW / 2 - 3, dH - 4);
    b.fillRect(dx + dW / 2 + 1, dy + 2, dW / 2 - 3, dH - 4);
    b.fillStyle = '#c9a070';
    b.fillRect(dx, dy, dW, 2);
    b.fillStyle = '#6b4526';
    b.fillRect(dx + dW / 2 - 1, dy + 2, 2, dH - 4);
    b.fillStyle = '#d8c8a8';
    b.fillRect(dx + dW - 3, dy + dH / 2, 2, 2);
    // 干草阁楼
    b.fillStyle = '#6b4526';
    b.fillRect(x + w / 2 - 9, wallTop + 2, 18, 11);
    b.fillStyle = '#c9a24a';
    b.fillRect(x + w / 2 - 8, wallTop + 3, 16, 9);
    b.fillStyle = '#e0bc62';
    for (let i = 0; i < 5; i++) b.fillRect(x + w / 2 - 7 + i * 3, wallTop + 4, 1, 7);
    // 屋顶
    for (let i = 0; i < 4; i++) {
      b.fillStyle = mixHex(s.roof2, s.roof, i / 3);
      const inset = Math.round(((4 - i) / 4) * (w * 0.10));
      b.fillRect(x + inset, y + Math.round(roofH * i / 4), w - inset * 2, Math.ceil(roofH / 4) + 1);
    }
    for (let yy = y + 4; yy < y + roofH; yy += 5) {
      const inset = Math.round((yy - y) / roofH * (w * 0.10));
      b.fillStyle = 'rgba(0,0,0,0.12)';
      b.fillRect(x + inset + 2, yy, w - inset * 2 - 4, 1);
    }
    b.fillStyle = shade(s.roof, 0.2);
    b.fillRect(x + Math.round(w * 0.10), y - 1, w - Math.round(w * 0.20), 3);
    // 风向标
    b.fillStyle = '#5a4a3a';
    b.fillRect(x + w / 2, y - 10, 1, 10);
    b.fillStyle = '#d8c060';
    b.fillRect(x + w / 2 - 3, y - 12, 7, 2);
    // 牌
    b.fillStyle = '#e8d8b0';
    b.fillStyle = '#e8d8b0';
    b.fillRect(x + 6, wallTop + 4, 14, 8);
    b.fillStyle = '#4a3a2a';
    b.font = 'bold 6px monospace';
    b.textAlign = 'center';
    b.fillText('谷', x + 13, wallTop + 10);
    b.textAlign = 'left';
  }

  _drawWindmill(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const w = s.w * TILE, h = s.h * TILE;
    const baseY = y + h;
    b.fillStyle = 'rgba(20,30,15,0.2)';
    b.fillRect(x + 2, baseY - 4, w - 4, 5);
    // 石基
    b.fillStyle = '#9a9284';
    b.fillRect(x + w / 2 - 16, baseY - 30, 32, 28);
    b.fillStyle = '#b0a89a';
    b.fillRect(x + w / 2 - 16, baseY - 30, 32, 3);
    for (let i = 0; i < 28; i += 6) {
      b.fillStyle = i % 12 ? '#8a8274' : '#a29a8c';
      b.fillRect(x + w / 2 - 16, baseY - 28 + i, 32, 1);
    }
    // 木塔
    b.fillStyle = '#8a5c35';
    b.fillRect(x + w / 2 - 12, baseY - 62, 24, 34);
    b.fillStyle = '#6b4526';
    b.fillRect(x + w / 2 + 6, baseY - 62, 6, 34);
    b.fillStyle = '#a97a4a';
    for (let i = 0; i < 34; i += 7) b.fillRect(x + w / 2 - 12, baseY - 62 + i, 24, 1);
    // 门与窗
    b.fillStyle = '#4a3020';
    b.fillRect(x + w / 2 - 5, baseY - 22, 10, 20);
    b.fillStyle = '#ffd98a';
    b.fillRect(x + w / 2 - 3, baseY - 50, 6, 6);
    b.fillStyle = '#6b5a44';
    b.fillRect(x + w / 2 - 4, baseY - 51, 8, 8);
    b.fillStyle = this.sim.isNight ? '#ffd98a' : '#9fc4d8';
    b.fillRect(x + w / 2 - 3, baseY - 50, 6, 6);
    // 顶
    b.fillStyle = '#7a5232';
    b.beginPath();
    b.moveTo(x + w / 2 - 15, baseY - 62);
    b.lineTo(x + w / 2, baseY - 76);
    b.lineTo(x + w / 2 + 15, baseY - 62);
    b.closePath();
    b.fill();
    // 风叶
    const cx = x + w / 2, cy = baseY - 62;
    const ang = this.time * 0.55;
    b.save();
    b.translate(cx, cy);
    b.rotate(ang);
    for (let i = 0; i < 4; i++) {
      b.rotate(Math.PI / 2);
      b.fillStyle = '#e8dcc0';
      b.fillRect(0, -2, 26, 4);
      b.fillStyle = '#c9b89a';
      b.fillRect(4, -2, 22, 1);
      b.fillStyle = '#8a6a4a';
      b.fillRect(2, -2, 2, 4);
    }
    b.fillStyle = '#5a4a3a';
    b.beginPath(); b.arc(0, 0, 3, 0, Math.PI * 2); b.fill();
    b.restore();
  }

  _drawHouse(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const w = s.w * TILE, h = s.h * TILE;
    const roofH = Math.round(h * 0.62);
    const wallTop = y + roofH;
    const wallH = h - roofH;
    // 影子
    b.fillStyle = 'rgba(20,30,15,0.18)';
    b.fillRect(x - 2, y + h - 3, w + 4, 5);
    // 墙
    b.fillStyle = C.wall;
    b.fillRect(x + 2, wallTop, w - 4, wallH);
    b.strokeStyle = 'rgba(70,48,32,0.5)';
    b.lineWidth = 1;
    b.strokeRect(x + 2.5, wallTop + 0.5, w - 5, wallH - 1);
    b.fillStyle = C.wall2;
    b.fillRect(x + 2, wallTop, w - 4, 3);
    b.fillStyle = C.wall3;
    for (let i = 0; i < wallH; i += 7) b.fillRect(x + 3, wallTop + i, w - 6, 1);
    if (s.id === 'loggingcamp') {
      b.fillStyle = '#8a6a4a';
      for (let i = 2; i < wallH; i += 5) b.fillRect(x + 3, wallTop + i, w - 6, 1);
      b.fillStyle = '#5a4030';
      b.fillRect(x + 2, wallTop, 3, wallH);
      b.fillRect(x + w - 5, wallTop, 3, wallH);
    }
    b.fillStyle = 'rgba(0,0,0,0.12)';
    b.fillRect(x + w - 8, wallTop, 6, wallH);
    // 门
    const dW = 14, dH = Math.min(wallH - 3, 22);
    const dx = s.door * TILE + TILE / 2 - dW / 2;
    const dy = y + h - dH - 2;
    b.fillStyle = C.woodDark;
    b.fillRect(dx - 1, dy - 1, dW + 2, dH + 2);
    b.fillStyle = C.wood;
    b.fillRect(dx, dy, dW, dH);
    b.fillStyle = C.woodLight;
    b.fillRect(dx + 2, dy + 2, 3, dH - 4);
    b.fillRect(dx + dW - 5, dy + 2, 3, dH - 4);
    b.fillStyle = C.gold;
    b.fillRect(dx + dW - 4, dy + dH / 2, 2, 2);
    // 门前石阶
    b.fillStyle = '#a89a86';
    b.fillRect(s.door * TILE + 2, y + h - 2, TILE - 4, 4);
    b.fillStyle = '#8a7c6a';
    b.fillRect(s.door * TILE + 2, y + h + 1, TILE - 4, 1);
    // 窗
    const winY = wallTop + 6;
    for (const wx of [x + 8, x + w - 22]) {
      if (Math.abs(wx - dx) < 18) continue;
      if (wx < x + 4) continue;
      b.fillStyle = '#6b5a44';
      b.fillRect(wx - 1, winY - 1, 16, 13);
      const lit = this.sim.isNight ? 1 : 0;
      b.fillStyle = lit ? '#ffd98a' : '#9fc4d8';
      b.fillRect(wx, winY, 14, 11);
      b.fillStyle = lit ? '#f0b85a' : '#7fa8c0';
      b.fillRect(wx, winY, 14, 3);
      b.fillStyle = '#6b5a44';
      b.fillRect(wx + 6, winY, 2, 11);
      b.fillRect(wx, winY + 4, 14, 1);
      if (lit) {
        b.globalAlpha = 0.18;
        b.fillStyle = '#ffcf70';
        b.fillRect(wx - 6, winY - 4, 26, 20);
        b.globalAlpha = 1;
      }
      // 窗台花箱
      b.fillStyle = '#6b4526';
      b.fillRect(wx - 2, winY + 12, 18, 4);
      b.fillStyle = '#4e7a3a';
      for (let fi = 0; fi < 4; fi++) {
        b.fillRect(wx + 1 + fi * 4, winY + 10, 1, 3);
        b.fillStyle = ['#f4e04e', '#f08ab0', '#f6f2e8', '#a88ad8'][(fi + wx) % 4];
        b.fillRect(wx + fi * 4, winY + 8, 2, 2);
        b.fillStyle = '#4e7a3a';
      }
    }
    // 屋顶
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      b.fillStyle = mixHex(s.roof2, s.roof, t);
      const inset = Math.round(((4 - i) / 4) * (w * 0.14));
      b.fillRect(x + inset, y + Math.round(roofH * i / 4), w - inset * 2, Math.ceil(roofH / 4) + 1);
    }
    // 瓦片
    const tileCol = shade(s.roof, -0.12);
    for (let yy = y + 4; yy < y + roofH; yy += 5) {
      const inset = Math.round((yy - y) / roofH * (w * 0.14));
      b.fillStyle = tileCol;
      b.fillRect(x + inset + 2, yy, w - inset * 2 - 4, 1);
      for (let xx = x + inset + 4; xx < x + w - inset - 4; xx += 8) {
        b.fillRect(xx + ((yy / 5) % 2 ? 4 : 0), yy + 1, 1, 3);
      }
    }
    // 屋脊
    b.fillStyle = shade(s.roof, 0.22);
    b.fillRect(x + Math.round(w * 0.14), y - 1, w - Math.round(w * 0.28), 3);
    b.fillStyle = shade(s.roof, -0.2);
    b.fillRect(x + Math.round(w * 0.14), y + 2, w - Math.round(w * 0.28), 1);
    // 屋檐小灯
    b.fillStyle = '#6b5a44';
    b.fillRect(x + w - 13, wallTop + 1, 3, 5);
    b.fillStyle = this.sim.isNight ? '#ffd98a' : '#f2e2b0';
    b.fillRect(x + w - 12, wallTop + 3, 1, 2);
    // 屋顶青苔与藤蔓
    const mk = (s.id || '').length + (s.id || '').charCodeAt(0);
    b.globalAlpha = 0.28;
    b.fillStyle = '#6a8a3a';
    b.fillRect(x + w * 0.2 + (mk % 7), y + roofH * 0.35, 8, 3);
    b.fillRect(x + w * 0.58 - (mk % 5), y + roofH * 0.55, 6, 2);
    b.globalAlpha = 1;
    if (mk % 3 === 0) {
      b.fillStyle = '#4f7a3a';
      b.fillRect(x + 4, wallTop + 2, 2, wallH * 0.6);
      b.fillRect(x + 4, wallTop + 2, 4, 2);
    }
    // 门牌
    if (s.sign) {
      b.fillStyle = C.woodDark;
      b.fillRect(x + w / 2 - 6, wallTop + 2, 12, 10);
      b.fillStyle = '#e8d8b0';
      b.fillRect(x + w / 2 - 5, wallTop + 3, 10, 8);
      b.fillStyle = '#4a3a2a';
      b.font = '8px monospace';
      b.textAlign = 'center';
      b.fillText(s.sign, x + w / 2, wallTop + 10);
      b.textAlign = 'left';
    }
    // 烟囱 & 烟
    if (s.type === 'house' && s.id !== 'home_chunxing') {
      const cx = x + w - 16, cy = y + 2;
      b.fillStyle = '#9a8a7a';
      b.fillRect(cx, cy, 7, 10);
      b.fillStyle = '#7a6a5a';
      b.fillRect(cx, cy, 7, 2);
      const sm = (this.time * 0.5) % 1;
      b.globalAlpha = 0.22 * (1 - sm);
      b.fillStyle = '#e8e8e8';
      b.fillRect(cx + 2 + Math.sin(this.time + sm * 6) * 2, cy - 4 - sm * 14, 3 + sm * 3, 3 + sm * 3);
      b.globalAlpha = 1;
    }
  }

  _drawMarket(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const w = s.w * TILE;
    // 柜台
    b.fillStyle = C.woodDark;
    b.fillRect(x + 4, y + 30, w - 8, 18);
    b.fillStyle = C.wood;
    b.fillRect(x + 4, y + 30, w - 8, 4);
    b.fillStyle = C.woodLight;
    for (let i = x + 10; i < x + w - 10; i += 12) b.fillRect(i, y + 34, 2, 14);
    // 货物
    const goods = [['#e46f8a', x + 12], ['#f2dd7a', x + 30], ['#e8823c', x + 54], ['#4a86bb', x + 76], ['#8a6fa8', x + 98]];
    for (const [col, gx] of goods) {
      b.fillStyle = C.woodLight;
      b.fillRect(gx - 3, y + 22, 14, 9);
      b.fillStyle = col;
      b.fillRect(gx - 1, y + 17, 4, 5);
      b.fillRect(gx + 4, y + 18, 4, 4);
      b.fillRect(gx + 1, y + 14, 3, 4);
    }
    // 立柱
    b.fillStyle = C.woodDark;
    b.fillRect(x + 3, y + 6, 4, 34);
    b.fillRect(x + w - 7, y + 6, 4, 34);
    // 遮阳棚
    for (let i = 0; i < w - 6; i += 12) {
      b.fillStyle = (i / 12) % 2 ? '#efe0c0' : '#c25b4e';
      b.fillRect(x + 3 + i, y + 2, 12, 12);
      b.fillStyle = 'rgba(0,0,0,0.12)';
      b.fillRect(x + 3 + i, y + 12, 12, 2);
    }
    b.fillStyle = 'rgba(20,30,15,0.16)';
    b.fillRect(x - 2, y + 42, w + 4, 5);
    // 挂灯与彩旗
    b.fillStyle = '#6b5a44';
    b.fillRect(x + 1, y + 16, 3, 5);
    b.fillRect(x + w - 4, y + 16, 3, 5);
    b.fillStyle = this.sim.isNight ? '#ffd98a' : '#f2e2b0';
    b.fillRect(x + 1, y + 20, 3, 4);
    b.fillRect(x + w - 4, y + 20, 3, 4);
    for (let i = 0; i < 5; i++) {
      b.fillStyle = ['#c25b4e', '#efe0c0', '#d8a04a', '#5f8a4a', '#8a6fa8'][i];
      b.fillRect(x + 8 + i * ((w - 16) / 5), y + 14, 4, 3);
    }
    // 幌子
    b.fillStyle = '#efe0c0';
    b.fillRect(x + w - 20, y + 14, 12, 16);
    b.fillStyle = '#c25b4e';
    b.font = 'bold 8px monospace';
    b.textAlign = 'center';
    b.fillText('集', x + w - 14, y + 26);
    b.textAlign = 'left';
  }

  _drawWell(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    const cx = x + TILE, cy = y + TILE;
    b.fillStyle = 'rgba(20,30,15,0.18)';
    b.fillRect(x + 2, y + TILE * 2 - 6, TILE * 2 - 4, 6);
    // 石圈
    b.fillStyle = C.stone2;
    b.fillRect(x + 6, y + 20, 36, 22);
    b.fillStyle = C.stone;
    b.fillRect(x + 6, y + 18, 36, 6);
    b.fillStyle = '#8a8478';
    for (let i = 0; i < 36; i += 9) b.fillRect(x + 6 + i, y + 19, 1, 20);
    b.fillStyle = '#4a6a80';
    b.fillRect(x + 12, y + 24, 24, 12);
    b.fillStyle = '#6a92a8';
    b.fillRect(x + 14, y + 26, 20, 3);
    // 木架
    b.fillStyle = C.woodDark;
    b.fillRect(x + 8, y + 2, 3, 20);
    b.fillRect(x + 37, y + 2, 3, 20);
    b.fillStyle = C.wood;
    b.fillRect(x + 8, y + 2, 32, 4);
    b.fillRect(x + 6, y - 2, 36, 5);
    // 吊桶
    const bob = Math.round(Math.sin(this.time * 2) * 1);
    b.fillStyle = '#c8b088';
    b.fillRect(cx - 3, y + 10 + bob, 7, 7);
    b.fillStyle = C.woodDark;
    b.fillRect(cx - 3, y + 10 + bob, 7, 2);
    b.fillRect(cx - 1, y + 6, 1, 5);
  }

  _drawSign(b, s) {
    const x = s.x * TILE, y = s.y * TILE;
    b.fillStyle = C.woodDark;
    b.fillRect(x + 10, y + 8, 4, 16);
    b.fillStyle = C.wood;
    b.fillRect(x + 2, y + 1, 20, 10);
    b.fillStyle = C.woodLight;
    b.fillRect(x + 2, y + 1, 20, 2);
    b.fillStyle = '#3f6a34';
    // 牌面上画三株小苗
    for (let i = 0; i < 3; i++) {
      const sx = x + 7 + i * 5;
      b.fillRect(sx + 1, y + 6, 1, 3);
      b.fillRect(sx, y + 5, 3, 1);
    }
    b.fillStyle = '#4a3a2a';
    b.fillRect(x + 4, y + 9, 16, 1);
  }

  // ---------- 围栏 / 小物件 / 鸡 ----------
  _drawFence(b, x, y) {
    const px = x * TILE, py = y * TILE;
    const has = (dx, dy) => this.world.fences.has(`${x + dx},${y + dy}`);
    const postX = px + TILE / 2;
    const base = py + TILE - 5;
    b.fillStyle = 'rgba(20,30,15,0.14)';
    b.fillRect(px + 2, py + TILE - 4, TILE - 4, 3);
    const rail = '#cbb28a', rail2 = '#a8906c';
    if (has(1, 0) || has(-1, 0)) {
      b.fillStyle = rail;
      b.fillRect(px, base - 9, TILE, 2);
      b.fillRect(px, base - 4, TILE, 2);
      b.fillStyle = rail2;
      b.fillRect(px, base - 8, TILE, 1);
    }
    if (has(0, 1) || has(0, -1)) {
      b.fillStyle = rail;
      b.fillRect(postX - 2, py, 2, TILE - 2);
      b.fillRect(postX + 1, py, 2, TILE - 2);
    }
    b.fillStyle = C.woodDark;
    b.fillRect(postX - 2, base - 14, 4, 15);
    b.fillStyle = rail;
    b.fillRect(postX - 2, base - 14, 4, 2);
    b.fillStyle = '#6b543c';
    b.fillRect(postX - 1, base - 12, 1, 12);
  }

  _drawProp(b, p) {
    const x = p.x * TILE, y = p.y * TILE;
    const cx = x + TILE / 2;
    switch (p.type) {
      case 'lantern': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(cx - 4, y + TILE - 4, 8, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(cx - 2, y + 8, 4, 15);
        b.fillStyle = '#5a4a3a';
        b.fillRect(cx - 5, y + 4, 10, 3);
        b.fillRect(cx - 6, y + 5, 12, 2);
        b.fillStyle = '#6b5a44';
        b.fillRect(cx - 5, y + 6, 10, 9);
        b.fillStyle = this.sim.isNight ? '#ffd98a' : '#e8e4d4';
        b.fillRect(cx - 3, y + 7, 6, 7);
        b.fillStyle = this.sim.isNight ? '#ffe9b0' : '#f6f2e6';
        b.fillRect(cx - 2, y + 8, 4, 3);
        break;
      }
      case 'flowerbed': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 3, y + TILE - 5, 18, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 2, y + 12, 20, 10);
        b.fillStyle = '#6b4526';
        b.fillRect(x + 3, y + 13, 18, 3);
        b.fillStyle = '#4e7a3a';
        for (let i = 0; i < 5; i++) {
          const fx = x + 5 + i * 3.5, fy = y + 12;
          b.fillRect(fx, fy - 3, 1, 4);
          b.fillStyle = ['#f4e04e', '#f08ab0', '#f6f2e8', '#a88ad8'][(i + p.x) % 4];
          b.fillRect(fx - 1, fy - 5, 3, 3);
          b.fillStyle = '#4e7a3a';
        }
        break;
      }
      case 'bench': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = C.wood;
        b.fillRect(x + 3, y + 12, 18, 5);
        b.fillStyle = C.woodLight;
        b.fillRect(x + 3, y + 12, 18, 2);
        b.fillStyle = C.wood;
        b.fillRect(x + 4, y + 8, 3, 5);
        b.fillRect(x + 17, y + 8, 3, 5);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 4, y + 17, 3, 3);
        b.fillRect(x + 17, y + 17, 3, 3);
        break;
      }
      case 'crate': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 5, y + TILE - 4, 14, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 5, y + 9, 14, 13);
        b.fillStyle = C.wood;
        b.fillRect(x + 6, y + 10, 12, 11);
        b.fillStyle = C.woodLight;
        b.fillRect(x + 6, y + 10, 12, 2);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 6, y + 14, 12, 1);
        b.fillRect(x + 6, y + 18, 12, 1);
        break;
      }
      case 'barrel': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 7, y + TILE - 4, 11, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 7, y + 8, 11, 15);
        b.fillStyle = C.wood;
        b.fillRect(x + 8, y + 9, 9, 13);
        b.fillStyle = '#9a8a6a';
        b.fillRect(x + 7, y + 11, 11, 1);
        b.fillRect(x + 7, y + 17, 11, 1);
        b.fillStyle = '#5a4a3a';
        b.fillRect(x + 9, y + 7, 7, 2);
        break;
      }
      case 'haystack': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = '#c9a24a';
        b.fillRect(x + 4, y + 8, 16, 13);
        b.fillRect(x + 6, y + 5, 12, 4);
        b.fillStyle = '#e0bc62';
        b.fillRect(x + 6, y + 9, 3, 11);
        b.fillRect(x + 12, y + 8, 2, 12);
        b.fillStyle = '#a8823a';
        for (let i = 0; i < 3; i++) b.fillRect(x + 4, y + 12 + i * 3, 16, 1);
        b.fillStyle = '#8a5c35';
        b.fillRect(x + 6, y + 20, 12, 2);
        break;
      }
      case 'scarecrow': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(cx - 5, y + TILE - 4, 10, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(cx - 1, y + 6, 3, 18);
        b.fillStyle = C.wood;
        b.fillRect(cx - 9, y + 10, 19, 3);
        b.fillStyle = '#c9a24a';
        b.fillRect(cx - 6, y + 12, 13, 9);
        b.fillStyle = '#e0bc62';
        b.fillRect(cx - 4, y + 14, 9, 1);
        b.fillStyle = '#d8c8a8';
        b.fillRect(cx - 4, y + 3, 9, 8);
        b.fillStyle = '#5a4a3a';
        b.fillRect(cx - 4, y + 6, 2, 2);
        b.fillRect(cx + 3, y + 6, 2, 2);
        b.fillStyle = '#b98b57';
        b.fillRect(cx - 6, y + 1, 13, 3);
        b.fillRect(cx - 4, y, 9, 2);
        break;
      }
      case 'clothesline': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 2, y + TILE - 4, 20, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 2, y + 6, 2, 18);
        b.fillRect(x + 20, y + 6, 2, 18);
        b.fillStyle = '#d8d0c0';
        b.fillRect(x + 3, y + 8, 18, 1);
        b.fillStyle = '#f6f2e6';
        b.fillRect(x + 6, y + 9, 5, 7);
        b.fillStyle = '#c9d8e8';
        b.fillRect(x + 14, y + 9, 5, 6);
        break;
      }
      case 'mailbox': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(cx - 3, y + TILE - 4, 6, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(cx - 1, y + 12, 3, 12);
        b.fillStyle = '#c8b088';
        b.fillRect(cx - 5, y + 8, 10, 6);
        b.fillStyle = '#e8d8b0';
        b.fillRect(cx - 4, y + 9, 8, 2);
        b.fillStyle = '#c0574a';
        b.fillRect(cx + 4, y + 6, 2, 6);
        break;
      }
      case 'signpost': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(cx - 2, y + TILE - 4, 5, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(cx - 1, y + 4, 3, 20);
        b.fillStyle = C.wood;
        b.fillRect(cx - 8, y + 5, 16, 6);
        b.fillRect(cx - 5, y + 12, 13, 5);
        b.fillStyle = C.woodLight;
        b.fillRect(cx - 8, y + 5, 16, 1);
        b.fillStyle = '#4a3a2a';
        b.fillRect(cx - 5, y + 7, 10, 1);
        b.fillRect(cx - 2, y + 14, 7, 1);
        break;
      }
      case 'bush': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = C.leafDark;
        b.fillRect(x + 3, y + 12, 18, 9);
        b.fillRect(x + 5, y + 9, 14, 5);
        b.fillStyle = C.leaf;
        b.fillRect(x + 4, y + 11, 15, 7);
        b.fillStyle = C.leaf3;
        b.fillRect(x + 6, y + 10, 6, 3);
        b.fillRect(x + 14, y + 13, 4, 3);
        if (p.x % 2 === 0) {
          b.fillStyle = '#e05a6a';
          b.fillRect(x + 8, y + 14, 2, 2);
          b.fillRect(x + 15, y + 11, 2, 2);
        }
        break;
      }
      case 'reeds': {
        b.fillStyle = 'rgba(20,30,15,0.1)';
        b.fillRect(x + 8, y + TILE - 4, 9, 3);
        b.fillStyle = '#5f8a4a';
        for (let i = 0; i < 4; i++) {
          const rx = x + 7 + i * 3;
          b.fillRect(rx, y + 6 + (i % 2) * 2, 1, 14);
          b.fillStyle = i % 2 ? '#7aa85a' : '#5f8a4a';
        }
        b.fillStyle = '#8a6a4a';
        b.fillRect(x + 8, y + 3, 2, 5);
        b.fillRect(x + 14, y + 5, 2, 4);
        break;
      }
      case 'lily': {
        b.fillStyle = '#4e8a5a';
        b.beginPath();
        b.ellipse(cx, y + 16, 6, 3.5, 0, 0, Math.PI * 2);
        b.fill();
        b.fillStyle = '#6aa86a';
        b.fillRect(cx - 3, y + 14, 4, 1);
        if (p.x % 2 === 0) {
          b.fillStyle = '#f2a0c0';
          b.fillRect(cx - 1, y + 11, 2, 2);
          b.fillStyle = '#ffe0ea';
          b.fillRect(cx, y + 11, 1, 1);
        }
        break;
      }
      case 'campfire': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = '#8a8274';
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          b.fillRect(cx + Math.cos(a) * 8 - 2, y + 17 + Math.sin(a) * 3 - 1, 4, 3);
        }
        b.fillStyle = '#5a3f28';
        b.fillRect(x + 7, y + 17, 11, 3);
        b.fillRect(x + 9, y + 15, 8, 3);
        const fl = Math.sin(this.time * 7 + p.x) * 2;
        b.fillStyle = '#e8823c';
        b.fillRect(cx - 3, y + 10 - fl, 6, 7);
        b.fillStyle = '#f2c14e';
        b.fillRect(cx - 2, y + 12 - fl, 4, 5);
        b.fillStyle = '#fff3c0';
        b.fillRect(cx - 1, y + 14 - fl, 2, 3);
        break;
      }
      case 'pier': {
        b.fillStyle = 'rgba(20,30,15,0.12)';
        b.fillRect(x + 2, y + 22, 48, 3);
        for (let i = 0; i < 3; i++) {
          b.fillStyle = i % 2 ? '#a97a4a' : '#b98b57';
          b.fillRect(x + 4 + i * 20, y + 16, 20, 6);
          b.fillStyle = '#8a5c35';
          b.fillRect(x + 4 + i * 20, y + 18, 20, 1);
        }
        b.fillStyle = '#6b4526';
        b.fillRect(x + 8, y + 22, 3, 6);
        b.fillRect(x + 28, y + 22, 3, 6);
        b.fillRect(x + 48, y + 22, 3, 6);
        break;
      }
      case 'fishrack': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(x + 4, y + 4, 2, 20);
        b.fillRect(x + 18, y + 4, 2, 20);
        b.fillStyle = C.wood;
        b.fillRect(x + 4, y + 5, 16, 2);
        b.fillStyle = '#8fa8b8';
        for (let i = 0; i < 3; i++) {
          const fx = x + 6 + i * 5;
          b.fillRect(fx, y + 7, 3, 7);
          b.fillRect(fx + 1, y + 14, 1, 2);
          b.fillStyle = '#b8ccd8';
          b.fillRect(fx, y + 7, 3, 1);
          b.fillStyle = '#8fa8b8';
        }
        break;
      }
      case 'bridge': {
        const bw = 4 * TILE;
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 2, y + 22, bw - 4, 3);
        for (let i = 0; i < 8; i++) {
          b.fillStyle = i % 2 ? '#a97a4a' : '#b98b57';
          b.fillRect(x + i * (bw / 8), y + 15, bw / 8 - 1, 7);
        }
        b.fillStyle = '#6b4526';
        b.fillRect(x + 2, y + 14, 3, 10);
        b.fillRect(x + bw - 5, y + 14, 3, 10);
        b.fillRect(x + bw / 2 - 2, y + 14, 3, 10);
        break;
      }
      case 'gate': {
        if (this.world.bridgeOpen) break;
        b.fillStyle = 'rgba(20,30,15,0.18)';
        b.fillRect(x + 2, y + 22, 20, 3);
        b.fillStyle = '#6b4526';
        b.fillRect(x + 3, y + 6, 3, 20);
        b.fillRect(x + 17, y + 6, 3, 20);
        b.fillStyle = '#8a5c35';
        for (let i = 0; i < 3; i++) b.fillRect(x + 3, y + 9 + i * 5, 17, 3);
        b.fillStyle = '#c0574a';
        b.fillRect(x + 9, y + 14, 5, 6);
        b.fillStyle = '#f2c14e';
        b.fillRect(x + 10, y + 15, 3, 2);
        break;
      }
      case 'logs': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        for (let i = 0; i < 3; i++) {
          b.fillStyle = '#8a5c35';
          b.fillRect(x + 4, y + 16 - i * 4, 16, 3);
          b.fillStyle = '#b98b57';
          b.fillRect(x + 18, y + 16 - i * 4, 2, 3);
        }
        break;
      }
      case 'clothshop': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 2, y + 21, 20, 3);
        // 立柱与柜台
        b.fillStyle = C.woodDark;
        b.fillRect(x + 3, y + 6, 3, 17);
        b.fillRect(x + 18, y + 6, 3, 17);
        b.fillStyle = C.wood;
        b.fillRect(x + 3, y + 15, 18, 8);
        b.fillStyle = C.woodLight;
        b.fillRect(x + 3, y + 15, 18, 2);
        // 粉白条纹遮阳棚
        for (let i = 0; i < 6; i++) {
          b.fillStyle = i % 2 ? '#f2c7d4' : '#fbf3df';
          b.fillRect(x + 2 + i * 3.4, y + 3, 4, 5);
        }
        b.fillStyle = 'rgba(0,0,0,0.12)';
        b.fillRect(x + 2, y + 8, 20, 1);
        // 挂着的衣服
        const clothes = [['#d98aa8', 5], ['#5f8f4a', 9], ['#4e6d8a', 13], ['#e8c060', 17]];
        for (const [col, ox] of clothes) {
          b.fillStyle = col;
          b.fillRect(x + ox, y + 9, 4, 6);
          b.fillStyle = 'rgba(255,255,255,0.35)';
          b.fillRect(x + ox, y + 9, 4, 1);
        }
        // 小剪刀招牌
        b.fillStyle = '#6b5a44';
        b.fillRect(x + 20, y + 1, 3, 3);
        break;
      }
      case 'questboard': {
        b.fillStyle = 'rgba(20,30,15,0.16)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = C.woodDark;
        b.fillRect(cx - 9, y + 8, 3, 15);
        b.fillRect(cx + 6, y + 8, 3, 15);
        b.fillStyle = '#6b4526';
        b.fillRect(cx - 12, y + 2, 24, 14);
        b.fillStyle = '#b98b57';
        b.fillRect(cx - 11, y + 3, 22, 12);
        b.fillStyle = '#a97a4a';
        for (let i = 0; i < 22; i += 5) b.fillRect(cx - 11 + i, y + 3, 1, 12);
        // 三张委托纸
        b.fillStyle = '#fff8e8';
        b.fillRect(cx - 9, y + 4, 6, 6);
        b.fillRect(cx - 2, y + 5, 7, 6);
        b.fillRect(cx - 6, y + 10, 8, 4);
        b.fillStyle = '#c0574a';
        b.fillRect(cx - 7, y + 4, 1, 1);
        b.fillRect(cx, y + 5, 1, 1);
        b.fillRect(cx - 4, y + 10, 1, 1);
        b.fillStyle = '#6b543c';
        for (let i = 0; i < 2; i++) {
          b.fillRect(cx - 8, y + 6 + i * 2, 4, 1);
          b.fillRect(cx - 1, y + 7 + i * 2, 5, 1);
        }
        // 有可领取委托时冒个感叹号
        if (this.sim.claimableQuests > 0) {
          const bob = Math.round(Math.sin(this.time * 4) * 1.5);
          b.fillStyle = 'rgba(255,246,200,0.95)';
          b.fillRect(cx - 2, y - 10 + bob, 4, 4);
          b.fillStyle = '#c0574a';
          b.fillRect(cx - 1, y - 9 + bob, 2, 3);
          b.fillRect(cx - 1, y - 6 + bob, 2, 1);
        }
        break;
      }
      case 'fern': {
        b.fillStyle = 'rgba(20,30,15,0.12)';
        b.fillRect(cx - 8, y + TILE - 4, 16, 2);
        b.strokeStyle = '#3f7a3a';
        b.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
          const ex = cx + i * 5;
          b.beginPath();
          b.moveTo(cx + i * 1.2, y + TILE - 3);
          b.quadraticCurveTo(ex, y + 10, ex + i * 2, y + 4);
          b.stroke();
          b.fillStyle = '#5f9a48';
          b.fillRect(ex + i * 2 - 1, y + 4 + (i % 2 ? 2 : 0), 2, 2);
        }
        break;
      }
      case 'grass': {
        b.fillStyle = 'rgba(20,30,15,0.1)';
        b.fillRect(cx - 7, y + TILE - 4, 14, 2);
        b.strokeStyle = '#5f8a42';
        b.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
          b.beginPath();
          b.moveTo(cx + i * 2, y + TILE - 3);
          b.lineTo(cx + i * 2 + (i > 0 ? 2 : -2), y + 9 - Math.abs(i));
          b.stroke();
        }
        b.fillStyle = '#7aa85a';
        b.fillRect(cx - 1, y + 12, 1, 4);
        break;
      }
      case 'mushroom': {
        const cols = [['#c84a3a', '#f0d0b0'], ['#b87a4a', '#e8d8c0'], ['#a85a6a', '#f0d8d0']];
        for (let i = 0; i < 3; i++) {
          const mx = x + 6 + i * 5, my = y + 17 - (i % 2) * 2;
          b.fillStyle = '#e8dcc0';
          b.fillRect(mx, my, 2, 5);
          const c = cols[(i + p.x) % cols.length];
          b.fillStyle = c[0];
          b.fillRect(mx - 3, my - 3, 8, 3);
          b.fillRect(mx - 2, my - 4, 6, 2);
          b.fillStyle = c[1];
          b.fillRect(mx - 1, my - 4, 2, 1);
          b.fillRect(mx + 2, my - 2, 1, 1);
        }
        break;
      }
      case 'berrybush': {
        b.fillStyle = 'rgba(20,30,15,0.14)';
        b.fillRect(x + 3, y + TILE - 4, 18, 3);
        b.fillStyle = '#2f5f38';
        b.fillRect(x + 3, y + 10, 18, 10);
        b.fillStyle = '#4f8a48';
        b.fillRect(x + 4, y + 9, 16, 8);
        b.fillStyle = '#6faa5a';
        b.fillRect(x + 6, y + 8, 8, 4);
        for (let i = 0; i < 6; i++) {
          b.fillStyle = i % 2 ? '#c84a5a' : '#8a5ab8';
          b.fillRect(x + 6 + (i * 7) % 12, y + 12 + (i % 3) * 2, 2, 2);
        }
        break;
      }
      case 'cattail': {
        b.fillStyle = 'rgba(20,30,15,0.08)';
        b.fillRect(cx - 5, y + TILE - 3, 10, 2);
        for (let i = 0; i < 4; i++) {
          const sx = cx - 6 + i * 4;
          b.strokeStyle = '#5f8a4a';
          b.lineWidth = 1;
          b.beginPath();
          b.moveTo(sx, y + TILE - 2);
          b.lineTo(sx + (i - 1.5) * 2, y + 4 + (i % 2) * 2);
          b.stroke();
          if (i < 2) {
            b.fillStyle = '#8a5a3a';
            b.fillRect(sx + (i - 1.5) * 2 - 1, y + 6 + (i % 2) * 2, 3, 5);
          }
        }
        break;
      }
      case 'wildflowers': {
        const cols = ['#f4e04e', '#f08ab0', '#f6f2e8', '#a88ad8', '#7ac0e8', '#f09a4a'];
        for (let i = 0; i < 6; i++) {
          const fx = x + 4 + (i * 7) % 17, fy = y + 18 - (i % 3) * 3;
          b.fillStyle = '#4e7a3a';
          b.fillRect(fx, fy, 1, 6);
          b.fillStyle = cols[(i + p.x) % cols.length];
          b.fillRect(fx - 1, fy - 2, 3, 2);
          b.fillStyle = '#fff6d8';
          b.fillRect(fx, fy - 2, 1, 1);
        }
        break;
      }
      case 'sapling': {
        b.fillStyle = 'rgba(20,30,15,0.10)';
        b.fillRect(cx - 6, y + TILE - 4, 12, 2);
        b.fillStyle = '#7a5a3a';
        b.fillRect(cx - 1, y + 12, 2, 8);
        b.fillStyle = C.leaf;
        b.fillRect(cx - 4, y + 8, 4, 3);
        b.fillRect(cx + 1, y + 6, 4, 3);
        b.fillStyle = C.leaf3;
        b.fillRect(cx - 2, y + 5, 3, 3);
        b.fillRect(cx + 3, y + 10, 2, 2);
        break;
      }
      case 'herb': {
        b.fillStyle = 'rgba(20,30,15,0.08)';
        b.fillRect(cx - 6, y + TILE - 3, 12, 2);
        for (let i = 0; i < 3; i++) {
          const hx = cx - 5 + i * 5;
          b.strokeStyle = '#4f7a3a';
          b.lineWidth = 1;
          b.beginPath();
          b.moveTo(hx, y + TILE - 2);
          b.lineTo(hx + (i - 1), y + 10);
          b.stroke();
          b.fillStyle = i % 2 ? '#8a6ac8' : '#a88ae0';
          b.fillRect(hx + (i - 1) - 1, y + 9, 3, 2);
          b.fillStyle = '#e8d8f8';
          b.fillRect(hx + (i - 1), y + 9, 1, 1);
        }
        break;
      }
      default:
        break;
    }
  }

  _drawAnimal(b, a) {
    const x = Math.round(a.x * TILE), y = Math.round(a.y * TILE);
    const flip = a.dir === 'left';
    const peck = a.peck > 0.5 ? 1 : 0;
    const R = (rx, ry, rw, rh, col) => { b.fillStyle = col; b.fillRect(rx, ry, rw, rh); };
    b.fillStyle = 'rgba(20,30,15,0.16)';
    const sw = (a.kind === 'cow' || a.kind === 'sheep') ? 14 : 8;
    b.fillRect(x - sw / 2, y + 1, sw, 2);
    b.save();
    b.translate(x, y);
    if (flip) b.scale(-1, 1);
    const kind = a.kind;

    if (kind === 'chick') {
      R(-3, -6, 5, 4, '#f2c14e'); R(-2, -9, 4, 3, '#ffe08a');
      R(-3, -10, 2, 1, '#d8a02e'); R(2, -7, 2, 1, '#e8823c');
      R(-2, -2, 1, 2, '#e8823c'); R(0, -2, 1, 2, '#e8823c');
    } else if (kind === 'chicken') {
      R(-4, -8, 8, 6, '#f2c14e'); R(-2, -13, 5, 5, '#ffe08a');
      R(-3, -15, 3, 2, '#d84a3a'); R(-2, -11, 2, 2, '#d84a3a');
      R(3, -8 + peck, 2, 1, '#e8823c'); R(-5, -9, 2, 4, '#d8a02e');
      R(-6, -11, 3, 3, '#f2c14e'); R(-3, -2, 1, 2, '#e8823c'); R(1, -2, 1, 2, '#e8823c');
    } else if (kind === 'duckling') {
      R(-3, -6, 6, 4, '#f6f2e8'); R(-1, -9, 4, 3, '#ffffff');
      R(3, -8 + peck, 3, 1, '#e8823c'); R(-2, -2, 1, 2, '#e8823c'); R(1, -2, 1, 2, '#e8823c');
    } else if (kind === 'duck') {
      R(-4, -8, 9, 5, '#f6f2e8'); R(3, -13, 3, 4, '#ffffff');
      R(0, -10, 3, 3, '#e8e2d4'); R(5, -12 + peck, 3, 1, '#e8823c');
      R(-2, -6, 5, 3, '#d8d2c4'); R(-3, -2, 1, 2, '#e8823c'); R(1, -2, 1, 2, '#e8823c');
    } else if (kind === 'goose') {
      R(-5, -8, 9, 5, '#c8ccd0'); R(2, -15, 3, 7, '#b8bcc0');
      R(4, -17, 4, 3, '#d8dce0'); R(-5, -6, 9, 3, '#f6f2e8');
      R(8, -16 + peck, 3, 1, '#e8823c'); R(-4, -2, 1, 2, '#e8823c'); R(1, -2, 1, 2, '#e8823c');
    } else if (kind === 'calf') {
      R(-5, -7, 10, 5, '#f6f2e8'); R(-4, -6, 4, 3, '#3a3a40');
      R(-6, -10, 5, 4, '#f6f2e8'); R(-7, -12, 2, 2, '#d8d2c4'); R(-3, -12, 2, 2, '#d8d2c4');
      R(-1, -9, 2, 2, '#f0a0b0'); R(-4, -2, 1, 2, '#3a3a40'); R(0, -2, 1, 2, '#3a3a40'); R(3, -2, 1, 2, '#3a3a40');
    } else if (kind === 'cow') {
      R(-8, -8, 16, 6, '#f6f2e8'); R(-8, -8, 6, 4, '#3a3a40'); R(1, -7, 5, 3, '#3a3a40');
      R(4, -13, 6, 5, '#f6f2e8'); R(4, -15, 2, 2, '#d8d2c4'); R(8, -15, 2, 2, '#d8d2c4');
      R(9, -11, 2, 2, '#f0a0b0'); R(-3, -4, 3, 2, '#f0a0b0');
      R(-7, -2, 2, 3, '#3a3a40'); R(-3, -2, 2, 3, '#3a3a40'); R(2, -2, 2, 3, '#3a3a40'); R(6, -2, 2, 3, '#3a3a40');
      R(-10, -7, 2, 5, '#3a3a40');
    } else if (kind === 'cat') {
      R(-4, -6, 8, 4, '#9aa0a8'); R(-4, -10, 4, 4, '#b8bcc0');
      R(-4, -12, 2, 2, '#9aa0a8'); R(-1, -12, 2, 2, '#9aa0a8');
      R(4, -9, 1, 5, '#9aa0a8');
      R(-3, -2, 1, 2, '#6a6a72'); R(-1, -2, 1, 2, '#6a6a72'); R(2, -2, 1, 2, '#6a6a72');
    } else if (kind === 'dog') {
      R(-5, -7, 10, 5, '#b98b57'); R(-5, -11, 5, 5, '#d8b06a');
      R(-7, -11, 2, 3, '#8a5a3a'); R(0, -11, 2, 3, '#8a5a3a');
      R(-2, -10, 2, 2, '#3a3a40'); R(2, -8, 3, 3, '#f6f2e8');
      R(5, -10, 1, 4, '#8a5a3a');
      R(-4, -2, 1, 2, '#8a5a3a'); R(-1, -2, 1, 2, '#8a5a3a'); R(2, -2, 1, 2, '#8a5a3a');
    } else if (kind === 'lamb') {
      R(-5, -7, 10, 5, '#f6f2e8'); R(-6, -11, 6, 5, '#ffffff');
      R(-4, -9, 2, 2, '#3a3a40'); R(-1, -8, 2, 2, '#3a3a40');
      R(-4, -2, 1, 2, '#3a3a40'); R(0, -2, 1, 2, '#3a3a40'); R(3, -2, 1, 2, '#3a3a40');
    } else if (kind === 'sheep') {
      R(-7, -8, 14, 6, '#f6f2e8'); R(-6, -12, 12, 5, '#ffffff');
      R(-6, -10, 4, 3, '#ffffff'); R(2, -11, 4, 3, '#ffffff');
      R(-8, -10, 3, 3, '#f6f2e8'); R(6, -10, 3, 3, '#f6f2e8');
      R(-6, -8, 3, 2, '#3a3a40'); R(-2, -8, 2, 2, '#3a3a40');
      R(-5, -2, 2, 3, '#3a3a40'); R(0, -2, 2, 3, '#3a3a40'); R(4, -2, 2, 3, '#3a3a40');
    } else {
      R(-4, -7, 8, 5, '#f6f2e8'); R(-2, -9, 4, 3, '#ffffff');
      R(2, -8 + peck, 2, 1, '#e8823c');
    }

    // 牧产就绪提示
    if (a.ready && a.product) {
      const bob = Math.round(Math.sin(this.time * 3 + a.x) * 1);
      if (a.product === 'egg') {
        R(-2, -20 + bob, 4, 5, '#f6f2e8'); R(-1, -19 + bob, 2, 2, '#ffffff');
      } else if (a.product === 'milk') {
        R(-2, -21 + bob, 5, 5, '#e8e2d4'); R(-2, -22 + bob, 5, 1, '#b8bcc0'); R(3, -20 + bob, 2, 1, '#b8bcc0');
      } else if (a.product === 'wool') {
        R(-3, -20 + bob, 6, 5, '#ffffff'); R(-2, -21 + bob, 4, 2, '#f6f2e8');
      }
    }
    b.restore();
  }
  _drawTree(b, t) {
    const chopped = t.regrowAt > this.sim.absHours;
    const x = t.x * TILE, y = t.y * TILE;
    if (chopped) {
      b.fillStyle = 'rgba(20,30,15,0.18)';
      b.fillRect(x + 4, y + 18, 16, 4);
      b.fillStyle = C.trunk;
      b.fillRect(x + 6, y + 13, 12, 7);
      b.fillStyle = '#c9a070';
      b.fillRect(x + 7, y + 12, 10, 3);
      b.fillStyle = '#8a6a4a';
      b.fillRect(x + 9, y + 13, 6, 1);
      return;
    }
    const kind = t.kind || (t.fruit === 'apple' ? 'apple' : 'oak');
    const seed = t.seed || 0.5;
    const sc = t.size === 2 ? 1.15 : 0.95;
    const cx = x + TILE / 2, base = y + TILE - 1;
    b.globalAlpha = 0.2;
    b.fillStyle = '#14200f';
    b.fillRect(cx - 9 * sc, base - 2, 18 * sc, 4);
    b.globalAlpha = 1;

    if (kind === 'dead') {
      b.fillStyle = '#6e5c4a';
      b.fillRect(cx - 2, base - 18 * sc, 4, 18 * sc);
      b.fillStyle = '#5a4a3a';
      b.fillRect(cx - 7, base - 15 * sc, 5, 2);
      b.fillRect(cx + 2, base - 12 * sc, 6, 2);
      b.fillRect(cx - 5, base - 10 * sc, 3, 2);
      b.fillRect(cx - 1, base - 21 * sc, 2, 4);
      b.fillStyle = '#8a7660';
      b.fillRect(cx - 2, base - 17 * sc, 1, 14 * sc);
      return;
    }

    // 树干
    const trunkCol = kind === 'birch' ? '#e8e0d0' : kind === 'pine' ? '#6b4a2e' : C.trunk;
    const tw = kind === 'birch' ? 4 : 6;
    b.fillStyle = trunkCol;
    b.fillRect(cx - tw / 2, base - 16 * sc, tw, 16 * sc);
    b.fillStyle = kind === 'birch' ? '#c8bca8' : C.trunk2;
    b.fillRect(cx + 1, base - 16 * sc, 2, 16 * sc);
    if (kind === 'birch') {
      b.fillStyle = '#4a4040';
      b.fillRect(cx - 2, base - 14 * sc, 2, 1);
      b.fillRect(cx, base - 11 * sc, 2, 1);
      b.fillRect(cx - 1, base - 8 * sc, 2, 1);
    }

    const top = base - 16 * sc;

    if (kind === 'pine') {
      // 高耸塔形松树：四层枝叶
      b.fillStyle = '#5a3f28';
      b.fillRect(cx - 2, base - 12 * sc, 4, 12 * sc);
      const tiers = [
        [22, 10, 0.42], [18, 16, 0.55], [14, 22, 0.68], [9, 28, 0.82],
      ];
      for (let i = 0; i < tiers.length; i++) {
        const [w, up, tone] = tiers[i];
        const ty = base - up * sc;
        b.fillStyle = '#1f3d28';
        b.beginPath();
        b.moveTo(cx, ty - 6 * sc);
        b.lineTo(cx - w * sc / 2 - 2, ty + 4 * sc);
        b.lineTo(cx + w * sc / 2 + 2, ty + 4 * sc);
        b.closePath();
        b.fill();
        b.fillStyle = i % 2 ? '#2c5636' : '#356640';
        b.beginPath();
        b.moveTo(cx, ty - 5 * sc);
        b.lineTo(cx - w * sc / 2, ty + 3 * sc);
        b.lineTo(cx + w * sc / 2, ty + 3 * sc);
        b.closePath();
        b.fill();
        b.fillStyle = i % 2 ? '#3f6e42' : '#4a7a48';
        b.beginPath();
        b.moveTo(cx, ty - 4 * sc);
        b.lineTo(cx - w * sc * 0.3, ty + 2 * sc);
        b.lineTo(cx + w * sc * 0.12, ty + 2 * sc);
        b.closePath();
        b.fill();
      }
      b.fillStyle = '#244a30';
      b.fillRect(cx - 3, base - 3, 6, 3);
      return;
    }

    if (kind === 'willow') {
      // 垂柳：圆冠 + 长垂枝
      const blobs = [
        [cx, top - 10 * sc, 14 * sc],
        [cx - 9 * sc, top - 5 * sc, 9 * sc],
        [cx + 9 * sc, top - 5 * sc, 9 * sc],
        [cx, top - 1 * sc, 11 * sc],
      ];
      b.fillStyle = '#31502c';
      for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.82, by - r * 0.62, r * 1.64, r * 1.2);
      b.fillStyle = '#4f7d42';
      for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.7, by - r * 0.5, r * 1.4, r);
      b.fillStyle = '#79a85c';
      for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.6, by - r * 0.55, r * 1.1, r * 0.7);
      b.fillStyle = '#9cc878';
      for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.4, by - r * 0.5, r * 0.7, r * 0.4);
      b.strokeStyle = '#6f9a50';
      b.lineWidth = 1;
      for (let i = -11; i <= 11; i += 2) {
        const sway = Math.sin(this.time * 1.5 + i) * 1.5;
        b.beginPath();
        b.moveTo(cx + i * sc, top - 2 * sc);
        b.quadraticCurveTo(cx + i * sc + sway, base - 8 * sc, cx + i * sc + sway * 1.5, base - 3);
        b.stroke();
        b.fillStyle = i % 4 ? '#8fbf6a' : '#b0d888';
        b.fillRect(cx + i * sc + sway * 1.5, base - 5 - (i % 3) * 2, 1, 2);
      }
      return;
    }

    if (kind === 'birch') {
      // 白桦：细白树干 + 分层的小圆冠
      const blobs = [
        [cx, top - 10 * sc, 8 * sc],
        [cx - 8 * sc, top - 5 * sc, 5 * sc],
        [cx + 8 * sc, top - 6 * sc, 5 * sc],
        [cx, top - 2 * sc, 7 * sc],
      ];
      b.fillStyle = '#3d5a30';
      for (const [bx, by, r] of blobs) {
        b.fillRect(bx - r * 0.85, by - r * 0.35, r * 1.7, r * 0.55);
        b.fillRect(bx - r * 0.55, by - r * 0.72, r * 1.1, r * 0.5);
      }
      b.fillStyle = '#5a7a44';
      for (const [bx, by, r] of blobs) {
        b.fillRect(bx - r * 0.75, by - r * 0.25, r * 1.5, r * 0.45);
        b.fillRect(bx - r * 0.45, by - r * 0.6, r * 0.9, r * 0.4);
      }
      b.fillStyle = '#7aa85a';
      for (const [bx, by, r] of blobs) {
        b.fillRect(bx - r * 0.6, by - r * 0.35, r * 1.2, r * 0.4);
        b.fillRect(bx - r * 0.3, by - r * 0.7, r * 0.6, r * 0.35);
      }
      b.fillStyle = '#9cc87a';
      for (const [bx, by, r] of blobs) {
        b.fillRect(bx - r * 0.35, by - r * 0.55, r * 0.55, r * 0.25);
      }
      b.fillStyle = '#c0dc9a';
      b.fillRect(cx - 3, top - 13 * sc, 3, 2);
      b.fillRect(cx + 6 * sc, top - 7 * sc, 3, 2);
      b.fillStyle = '#6b5a44';
      b.fillRect(cx - 7 * sc, top - 4 * sc, 3, 1);
      b.fillRect(cx + 5 * sc, top - 2 * sc, 4, 1);
      return;
    }

    // 橡树 / 苹果树：蓬松圆冠，按 seed 微调
    const palettes = [
      ['#2f6b38', '#4f8f48', '#78b45e'],
      ['#356b42', '#5c9450', '#86b86a'],
      ['#4a6f34', '#6f9448', '#9cba62'],
    ];
    const pal = palettes[Math.floor(seed * palettes.length) % palettes.length];
    const off = (seed - 0.5) * 5;
    const blobs = [
      [cx + off, top - 9 * sc, 13 * sc],
      [cx - 8 * sc + off, top - 3 * sc, 9 * sc],
      [cx + 8 * sc + off, top - 4 * sc, 9 * sc],
      [cx + off, top - 2 * sc, 11 * sc],
    ];
    b.fillStyle = '#22452a';
    for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.82, by - r * 0.68, r * 1.64, r * 1.3);
    b.fillStyle = pal[0];
    for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.7, by - r * 0.55, r * 1.4, r * 1.05);
    b.fillStyle = pal[1];
    for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.6, by - r * 0.62, r * 1.2, r * 0.9);
    b.fillStyle = pal[2];
    for (const [bx, by, r] of blobs) b.fillRect(bx - r * 0.45, by - r * 0.55, r * 0.7, r * 0.5);
    b.fillStyle = '#a8d47a';
    b.fillRect(cx - 4 + off, top - 13 * sc, 4, 2);
    b.fillRect(cx + 6 * sc + off, top - 8 * sc, 3, 2);

    if (t.fruit === 'apple') {
      b.fillStyle = '#c84a3a';
      const dots = [[-6, -5], [7, -2], [-2, -9], [5, -8], [-8, 1]];
      for (const [dx, dy] of dots) {
        b.fillRect(cx + dx * sc + off, top + dy * sc, 2, 2);
        b.fillStyle = '#e86a5a';
        b.fillRect(cx + dx * sc + off, top + dy * sc, 1, 1);
        b.fillStyle = '#c84a3a';
      }
    } else if (seed > 0.7) {
      b.fillStyle = '#e8a04a';
      b.fillRect(cx - 6 + off, top - 5 * sc, 2, 2);
      b.fillRect(cx + 7 + off, top - 1, 2, 2);
    }
  }
  _drawRock(b, r) {
    const x = r.x * TILE, y = r.y * TILE;
    if (r.mined) {
      b.globalAlpha = 0.35;
      b.fillStyle = '#8a8274';
      b.fillRect(x + 7, y + TILE - 6, 10, 3);
      b.fillRect(x + 10, y + TILE - 8, 4, 2);
      b.globalAlpha = 1;
      return;
    }
    const sc = r.size === 2 ? 1 : 0.7;
    b.globalAlpha = 0.18;
    b.fillStyle = '#14200f';
    b.fillRect(x + 4, y + TILE - 5, 16, 4);
    b.globalAlpha = 1;
    b.fillStyle = '#3f3f47';
    b.fillRect(x + 4, y + 12 * sc + 3, 16 * sc, 11 * sc);
    b.fillStyle = C.stone2;
    b.fillRect(x + 5, y + 13 * sc + 4, 14 * sc, 9 * sc);
    b.fillStyle = C.stone;
    b.fillRect(x + 7, y + 11 * sc + 4, 10 * sc, 6 * sc);
    b.fillStyle = '#c8c0b0';
    b.fillRect(x + 8, y + 11 * sc + 4, 4 * sc, 2 * sc);
    b.fillStyle = '#7a7264';
    b.fillRect(x + 12, y + 16 * sc + 4, 3, 2);
    if (r.ore) {
      b.fillStyle = '#e8c060';
      b.fillRect(x + 8, y + 15, 2, 2);
      b.fillStyle = '#8fd8f0';
      b.fillRect(x + 12, y + 17, 2, 1);
    }
    // 苔藓
    if (r.size === 2) {
      b.fillStyle = C.leaf2;
      b.fillRect(x + 6, y + 17, 3, 2);
    }
  }

  // ---------- 村民 ----------
  _drawVillager(b, v) {
    const sel = this.sim.selected === v;
    if (v.alpha <= 0.05) return;
    const sx = Math.round(v.x * TILE);
    const sy = Math.round(v.y * TILE);
    // 走到房屋屋顶/墙体下方时半透明，让玩家始终能看见人
    let occl = 1;
    for (const bd of this.world.buildings) {
      const roofH = Math.round(bd.h * TILE * 0.62);
      const wallTop = bd.y * TILE + roofH;
      if (v.x >= bd.x && v.x <= bd.x + bd.w && v.y * TILE >= wallTop && v.y < bd.y + bd.h + 0.9) { occl = 0.5; break; }
    }
    let dir = v.dir;
    let action = 'idle';
    let frame = 0;
    if (v.state === 'task' && v.task) {
      if (v.task.stage === 'working') { action = v.action; frame = v.frame % 4; }
      else if (v.task.stage === 'toWork') { action = v.carry ? 'carry' : 'walk'; frame = v.frame % 2; }
      else if (v.task.stage === 'deliver') { action = 'carry'; frame = v.frame % 2; }
    } else if (v.state === 'goingSleep' || v.state === 'wander') {
      action = 'walk'; frame = v.frame % 2;
    } else if (v.state === 'sleeping') {
      action = 'sleep';
    }

    // 选中光环
    if (sel) {
      const pulse = (Math.sin(this.time * 4) + 1) / 2;
      b.strokeStyle = `rgba(255,214,90,${0.55 + pulse * 0.35})`;
      b.lineWidth = 2;
      b.beginPath();
      b.ellipse(sx, sy - 1, 11, 5, 0, 0, Math.PI * 2);
      b.stroke();
    }
    // 影子
    b.globalAlpha = 0.25 * v.alpha;
    b.fillStyle = '#101808';
    b.fillRect(sx - 6, sy - 2, 12, 3);
    b.globalAlpha = v.alpha;

    // 干活目标连线 + 目标高亮
    if (v.task && v.task.stage !== 'deliver' && Number.isFinite(v.task.tx)) {
      const tx = v.task.tx * TILE + TILE / 2, ty = v.task.ty * TILE + TILE / 2;
      const pulse = (Math.sin(this.time * 5) + 1) / 2;
      b.strokeStyle = `rgba(255,214,90,${0.3 + pulse * 0.25})`;
      b.lineWidth = 1;
      b.setLineDash([3, 3]);
      b.beginPath();
      b.moveTo(sx, sy - 8);
      b.lineTo(tx, ty - 6);
      b.stroke();
      b.setLineDash([]);
      b.strokeStyle = `rgba(255,214,90,${0.6 + pulse * 0.4})`;
      b.lineWidth = 2;
      b.strokeRect(v.task.tx * TILE + 2, v.task.ty * TILE + 2, TILE - 4, TILE - 4);
    }

    const blink = v.state !== 'sleeping' && ((this.time + v.uid * 1.37) % 4.6) < 0.12;
    const spr = this.sprites.get(v.colors, dir, action, frame, blink);
    const breathe = ((v.state === 'auto' || v.state === 'wander') && Math.sin(this.time * 2 + v.uid) > 0.55) ? 1 : 0;
    b.globalAlpha = v.alpha * occl;
    b.drawImage(spr, sx - 11, sy - 20 + breathe);
    b.globalAlpha = 1;

    // 工作进度环
    if (v.task && v.task.stage === 'working') {
      const pr = v.task.progress || 0;
      b.strokeStyle = 'rgba(30,26,22,0.55)';
      b.lineWidth = 3;
      b.beginPath(); b.arc(sx, sy - 26, 6, -Math.PI / 2, Math.PI * 1.5); b.stroke();
      b.strokeStyle = '#ffd65a';
      b.lineWidth = 2;
      b.beginPath(); b.arc(sx, sy - 26, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); b.stroke();
    }
    // 睡觉 zzz
    if (v.state === 'sleeping') {
      b.fillStyle = 'rgba(240,240,255,0.9)';
      b.font = 'bold 9px monospace';
      const zt = (this.time * 0.8) % 1;
      b.globalAlpha = 1 - zt * 0.7;
      b.fillText('z', sx + 6, sy - 24 - zt * 10);
      b.globalAlpha = 1;
    }
  }

  // 在自家屋顶上冒 z，表示人在屋里睡觉
  _drawSleepMarks(b) {
    for (const v of this.sim.villagers) {
      if (v.state !== 'sleeping') continue;
      const bd = v.home;
      if (!bd) continue;
      const sx = (bd.door + 0.5) * TILE;
      const sy = (bd.y + bd.h) * TILE - 4;
      b.fillStyle = 'rgba(240,240,255,0.9)';
      b.font = 'bold 8px monospace';
      for (let k = 0; k < 3; k++) {
        const ph = (this.time * 0.7 + k * 0.33 + v.uid) % 1;
        b.globalAlpha = (1 - ph) * 0.9;
        b.fillText('z', sx + 8 + ph * 8, sy - 8 - ph * 16);
      }
      b.globalAlpha = 1;
    }
  }

  // ---------- 气泡 ----------
  _drawBubbles(b) {
    for (const v of this.sim.villagers) {
      if (v.alpha < 0.5) continue;
      const sx = Math.round(v.x * TILE);
      const sy = Math.round(v.y * TILE);
      let emoji = null;
      if (v.speech) emoji = v.speech.emoji;
      else if (v.state === 'task') emoji = null;
      else if (Math.sin(this.time * 0.7 + v.uid) > 0.75) emoji = v.moodEmoji;
      if (!emoji) continue;
      const bob = Math.round(Math.sin(this.time * 2 + v.uid) * 1.5);
      const bx = sx + 7, by = sy - 30 + bob;
      this._bubble(b, bx, by, 13, 13, emoji);
    }
    // 选中的村民：显示想法文字（世界内小字，低分辨率下用英文标点更清楚，这里只画图标）
    const sv = this.sim.selected;
    if (sv && sv.state !== 'sleeping') {
      const sx = Math.round(sv.x * TILE);
      const sy = Math.round(sv.y * TILE);
      const glow = (Math.sin(this.time * 3) + 1) / 2;
      b.fillStyle = `rgba(255,220,120,${0.25 + glow * 0.2})`;
      b.beginPath(); b.arc(sx, sy - 32, 4, 0, Math.PI * 2); b.fill();
    }
  }

  _bubble(b, x, y, w, h, emoji) {
    b.fillStyle = 'rgba(255,250,238,0.96)';
    this._roundRect(b, x - w / 2, y - h / 2, w, h, 3);
    b.fill();
    b.fillStyle = 'rgba(255,250,238,0.96)';
    b.fillRect(x - 2, y + h / 2 - 1, 4, 3);
    b.fillStyle = 'rgba(120,100,80,0.25)';
    b.fillRect(x - 1, y + h / 2 + 2, 2, 1);
    // 像素小图标：不依赖 emoji 字体，任何设备都清晰
    this._icon(b, emoji, x, y, 1.4);
  }

  _icon(b, emoji, cx, cy, sc) {
    const R = (x, y, w, h, col) => { b.fillStyle = col; b.fillRect(cx + x * sc, cy + y * sc, w * sc, h * sc); };
    switch (emoji) {
      case '💤': case '😴': {
        b.fillStyle = '#7a8ab0';
        b.font = `bold ${Math.max(6, 5 * sc)}px monospace`;
        b.textAlign = 'center';
        b.fillText('z', cx, cy + 2 * sc);
        b.textAlign = 'left';
        break;
      }
      case '🍞': case '🍎':
        R(-3, -1, 6, 4, '#e0a04a'); R(-3, -1, 6, 1, '#f0c070'); R(-1, -3, 2, 2, '#c07830'); break;
      case '😖': case '💢':
        R(-1, -4, 2, 5, '#c0574a'); R(-1, 2, 2, 2, '#c0574a'); break;
      case '💗': case '😊': case '💬':
        if (emoji === '💗') {
          R(-4, -3, 3, 3, '#e07a9a'); R(1, -3, 3, 3, '#e07a9a');
          R(-4, -1, 8, 3, '#e07a9a'); R(-2, 2, 4, 2, '#e07a9a'); R(0, 4, 1, 1, '#e07a9a');
        } else if (emoji === '💬') {
          R(-4, -3, 8, 5, '#5a8ac0'); R(-2, 2, 3, 2, '#5a8ac0');
          R(-2, -2, 1, 1, '#fff8e8'); R(0, -2, 1, 1, '#fff8e8'); R(2, -2, 1, 1, '#fff8e8');
        } else {
          R(-4, -3, 3, 3, '#e8b84a'); R(1, -3, 3, 3, '#e8b84a');
          R(-4, -1, 8, 3, '#e8b84a'); R(-2, 2, 4, 2, '#e8b84a');
        }
        break;
      case '💧': case '🌱': case '⛏': case '🧺': case '🪓': case '🎣': case '🍄': case '💪':        if (emoji === '💧') { R(-1, -4, 2, 3, '#7ac8e8'); R(-3, -1, 6, 4, '#5ab8e0'); R(-1, 3, 2, 1, '#8fd8f0'); }
        else if (emoji === '🌱') { R(-1, -3, 1, 6, '#5a9a3a'); R(-4, 1, 4, 2, '#7ac35a'); R(1, -1, 4, 2, '#7ac35a'); }
        else if (emoji === '⛏') { R(-1, -5, 2, 8, '#9a6b3f'); R(-4, -2, 7, 2, '#c8ccd0'); }
        else if (emoji === '🪓') { R(-1, -4, 2, 7, '#7a5232'); R(-4, -4, 7, 4, '#c8ccd0'); }
        else if (emoji === '🧺') { R(-4, -2, 8, 5, '#b98b57'); R(-3, -3, 6, 1, '#d8a878'); R(-4, -2, 8, 1, '#8a6039'); }
        else if (emoji === '🎣') { R(-4, -4, 1, 8, '#8a6039'); R(-4, -5, 6, 1, '#c8ccd0'); R(2, 3, 2, 2, '#c0574a'); }
        else if (emoji === '🍄') { R(-1, 0, 2, 4, '#e8e0c8'); R(-3, -3, 6, 3, '#c25b4e'); }
        else { R(-2, -3, 4, 5, '#d8b06a'); R(2, -3, 3, 2, '#d8b06a'); }
        break;
      default:
        // 默认：一张小笑脸，避免出现乱码方块
        R(-4, -3, 8, 6, '#ffe0a0');
        R(-3, -4, 6, 1, '#ffe0a0');
        R(-3, 3, 6, 1, '#ffe0a0');
        R(-3, -1, 1, 2, '#5a4a3a');
        R(2, -1, 1, 2, '#5a4a3a');
        R(-2, 2, 4, 1, '#5a4a3a');
    }
  }

  _roundRect(b, x, y, w, h, r) {
    b.beginPath();
    b.moveTo(x + r, y);
    b.arcTo(x + w, y, x + w, y + h, r);
    b.arcTo(x + w, y + h, x, y + h, r);
    b.arcTo(x, y + h, x, y, r);
    b.arcTo(x, y, x + w, y, r);
    b.closePath();
  }

  // ---------- 粒子/文字 ----------
  addEffect(type, x, y, opts = {}) {
    this.effects.push({ type, x, y, t: 0, life: opts.life || 0.7, ...opts });
    if (this.effects.length > 220) this.effects.splice(0, 40);
  }

  burst(type, tx, ty) {
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE - 4;
    const n = type === 'water' ? 6 : 7;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const sp = 20 + Math.random() * 30;
      this.addEffect('p', x, y, {
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 15,
        col: type === 'water' ? '#8fd8f0' : type === 'chop' ? '#c9a070' : type === 'harvest' ? '#ffe08a' : '#8a6039',
        size: 1 + Math.round(Math.random() * 2), life: 0.5 + Math.random() * 0.4,
      });
    }
    if (type === 'harvest') this.addText(tx, ty, '+1', '#ffd65a');
  }

  addText(tx, ty, text, col = '#fff8e8') {
    this.addEffect('text', tx * TILE + TILE / 2, ty * TILE + 4, { text, col, life: 1.1 });
  }

  _updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      if (e.t >= e.life) { this.effects.splice(i, 1); continue; }
      if (e.type === 'p') {
        e.x += (e.vx || 0) * dt;
        e.y += (e.vy || 0) * dt;
        e.vy = (e.vy || 0) + 140 * dt;
      }
    }
  }

  _drawEffects(b) {
    for (const e of this.effects) {
      const k = 1 - e.t / e.life;
      if (e.type === 'p') {
        b.globalAlpha = k;
        b.fillStyle = e.col;
        b.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
        b.globalAlpha = 1;
      } else if (e.type === 'text') {
        b.globalAlpha = k;
        b.fillStyle = e.col;
        b.font = 'bold 7px monospace';
        b.textAlign = 'center';
        b.fillText(e.text, Math.round(e.x), Math.round(e.y - e.t * 16));
        b.textAlign = 'left';
        b.globalAlpha = 1;
      }
    }
  }

  // ---------- 昼夜与季节 ----------
  _drawNight(b) {
    const hr = this.sim.hour;
    let tint = null, a = 0;
    if (hr < 5) { tint = '#0a1028'; a = 0.72; }
    else if (hr < 6.5) { tint = '#141838'; a = 0.72 - (hr - 5) * 0.4; }
    else if (hr < 17.5) tint = null;
    else if (hr < 19.5) { tint = '#5a2e3a'; a = (hr - 17.5) * 0.18; }
    else if (hr < 21) { tint = '#141838'; a = 0.34 + (hr - 19.5) * 0.2; }
    else { tint = '#0a1028'; a = 0.72; }
    // 昼夜遮罩是全屏的：先重置变换，否则只会盖住世界原点附近
    const saved = b.getTransform();
    b.setTransform(1, 0, 0, 1, 0, 0);
    if (tint && a > 0.01) {
      b.globalAlpha = Math.min(0.74, a);
      b.fillStyle = tint;
      b.fillRect(0, 0, this.bufW, this.bufH);
      b.globalAlpha = 1;
    }
    const ox = saved.e, oy = saved.f;
    // 夜里门口透出的暖光
    if (hr >= 19 || hr < 6) {
      for (const bd of this.world.buildings) {
        const dx = bd.door * TILE + TILE / 2 + ox, dy = (bd.y + bd.h) * TILE + oy;
        b.globalAlpha = 0.20;
        b.fillStyle = '#ffcf70';
        b.beginPath();
        b.ellipse(dx, dy, 16, 10, 0, 0, Math.PI * 2);
        b.fill();
        b.globalAlpha = 1;
      }
      // 路灯与篝火的暖光
      for (const p of this.world.props) {
        if (p.type !== 'lantern' && p.type !== 'campfire') continue;
        const dx = p.x * TILE + TILE / 2 + ox, dy = p.y * TILE + 12 + oy;
        const rad = p.type === 'campfire' ? 26 : 15;
        b.globalAlpha = p.type === 'campfire' ? 0.26 : 0.2;
        b.fillStyle = '#ffcf70';
        b.beginPath();
        b.ellipse(dx, dy, rad, rad * 0.62, 0, 0, Math.PI * 2);
        b.fill();
        b.globalAlpha = 1;
      }
      // 星星
      b.fillStyle = 'rgba(255,255,230,0.8)';
      for (let i = 0; i < 18; i++) {
        const sx = (i * 137.5) % this.bufW;
        const sy = (i * 71.3) % (this.bufH * 0.4);
        b.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 1.5 + i));
        b.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
      b.globalAlpha = 1;
    }
    // 黄昏/清晨整体暖色
    if (hr >= 5.5 && hr < 7.5) {
      const k = 1 - Math.abs(hr - 6.5) / 1;
      b.globalAlpha = 0.10 * k;
      b.fillStyle = '#ffb070';
      b.fillRect(0, 0, this.bufW, this.bufH);
      b.globalAlpha = 1;
    }
    b.setTransform(saved);
  }

  // 天气：雨丝 / 暴雨压暗
  _drawWeather(b) {
    const w = this.sim.weather;
    if (w !== 'rain' && w !== 'storm') return;
    const heavy = w === 'storm';
    const saved = b.getTransform();
    b.setTransform(1, 0, 0, 1, 0, 0);
    const t = this.time;

    // 天空压暗：上深下浅，像真的阴天
    const grad = b.createLinearGradient(0, 0, 0, this.bufH);
    grad.addColorStop(0, heavy ? 'rgba(18,26,46,0.36)' : 'rgba(26,40,60,0.16)');
    grad.addColorStop(1, heavy ? 'rgba(34,46,66,0.16)' : 'rgba(30,44,64,0.06)');
    b.fillStyle = grad;
    b.fillRect(0, 0, this.bufW, this.bufH);

    // 雨丝：远/中/近三层，带风斜
    const wind = heavy ? 0.34 : 0.22;
    const layers = heavy
      ? [[86, 150, 11, 0.5], [104, 240, 8, 0.66], [70, 350, 5, 0.85]]
      : [[52, 115, 8, 0.42], [44, 190, 5, 0.6]];
    let seed = 0;
    for (const [count, speed, len, alpha] of layers) {
      b.strokeStyle = `rgba(206,228,255,${alpha})`;
      b.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        seed = i * 97.13 + len * 13;
        const x = ((seed + t * speed * wind) % (this.bufW + 48)) - 24;
        const y = ((seed * 1.7 + t * speed) % (this.bufH + 36)) - 18;
        b.beginPath();
        b.moveTo(x, y);
        b.lineTo(x - len * wind, y + len);
        b.stroke();
      }
    }

    // 落地水花：一圈小涟漪
    const splashes = heavy ? 16 : 8;
    for (let i = 0; i < splashes; i++) {
      const phase = (t * 1.6 + i * 0.37) % 1;
      if (phase > 0.4) continue;
      const sx = ((i * 137.5 + Math.sin(i * 3.1) * 30) % this.bufW + this.bufW) % this.bufW;
      const sy = this.bufH - 10 - ((i * 53) % (heavy ? 70 : 40));
      const r = 1 + phase * 4;
      b.globalAlpha = (0.4 - phase) * (heavy ? 1.0 : 0.7);
      b.strokeStyle = '#cfe6ff';
      b.lineWidth = 1;
      b.beginPath();
      b.ellipse(sx, sy, r, r * 0.42, 0, 0, Math.PI * 2);
      b.stroke();
      b.globalAlpha = 1;
    }

    // 暴雨：闪电 + 短暂照亮
    if (heavy) {
      const flash = Math.sin(t * 2.3) > 0.9965 ? 0.3 : 0;
      if (flash > 0) {
        b.globalAlpha = flash;
        b.fillStyle = '#e6eeff';
        b.fillRect(0, 0, this.bufW, this.bufH);
        b.globalAlpha = 1;
        b.strokeStyle = 'rgba(235,244,255,0.85)';
        b.lineWidth = 1;
        const bx = (Math.floor(t * 2.3) * 53) % this.bufW;
        b.beginPath();
        b.moveTo(bx, 0);
        b.lineTo(bx + 6, this.bufH * 0.22);
        b.lineTo(bx - 3, this.bufH * 0.26);
        b.lineTo(bx + 5, this.bufH * 0.5);
        b.stroke();
      }
    }
    b.setTransform(saved);
  }
  _drawSeasons(b) {
    const season = this.sim.season;
    if (season === 3) {
      // 冬：飘雪
      b.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 26; i++) {
        const sx = (i * 53.7 + this.time * 9 * (1 + i % 3)) % this.bufW;
        const sy = (i * 91.3 + this.time * 14 * (1 + i % 2)) % this.bufH;
        b.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    } else if (season === 2) {
      // 秋：落叶
      b.fillStyle = 'rgba(230,150,70,0.75)';
      for (let i = 0; i < 12; i++) {
        const sx = (i * 87.3 + this.time * 12) % this.bufW;
        const sy = (i * 61.7 + this.time * 9 + Math.sin(this.time + i) * 10) % this.bufH;
        b.fillRect(Math.round(sx), Math.round(sy), 1, 2);
      }
    } else if (season === 0) {
      // 春：花瓣
      b.fillStyle = 'rgba(255,200,220,0.7)';
      for (let i = 0; i < 9; i++) {
        const sx = (i * 97.3 + this.time * 8) % this.bufW;
        const sy = (i * 73.1 + this.time * 6 + Math.sin(this.time * 0.8 + i) * 12) % this.bufH;
        b.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    }
    // 关键：恢复不透明度，否则下一帧的夜色会被削弱
    b.globalAlpha = 1;
  }

  // 头像（DOM 用）
  avatar(v, size) {
    const k = `${v.id}_${v.appearanceKey || 'default'}_${size}`;
    if (!this.avatarCache.has(k)) this.avatarCache.set(k, this.sprites.avatar(v.colors, size));
    return this.avatarCache.get(k);
  }
}

function shade(hexColor, amt) {
  const [r, g, b] = hex(hexColor);
  if (amt >= 0) return rgb([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
  return rgb([r * (1 + amt), g * (1 + amt), b * (1 + amt)]);
}
function mixHex(a, b2, t) { return rgb(mix(a, b2, t)); }

function hash(n) { let x = n | 0; x = ((x >> 16) ^ x) * 0x45d9f3b; x = ((x >> 16) ^ x) * 0x45d9f3b; x = (x >> 16) ^ x; return x >>> 0; }
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}


























