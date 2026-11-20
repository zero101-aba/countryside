// 村庄地图：地形、建筑、树木、农田、池塘、集市
import { MAP_W, MAP_H, CROPS, C, TILE } from './config.js';

export const rnd = mulberry32(20261118);
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class World {
  constructor() {
    this.w = MAP_W;
    this.h = MAP_H;
    this.tiles = new Uint8Array(this.w * this.h).fill(0); // 0草 1土 2小路 3水 4沙 5农田 6石砖
    this.block = new Uint8Array(this.w * this.h).fill(0);
    this.variant = new Uint8Array(this.w * this.h);
    this.plots = [];
    this.plotMap = new Map();
    this.structures = [];
    this.buildings = [];
    this.trees = [];
    this.rocks = [];
    this.forages = [];
    this.decor = [];
    this.flowers = [];
    this.waters = [];      // 水面格子（动画/钓鱼点）
    this.props = [];       // 长椅、灯笼、花坛、篱笆等小物件
    this.fences = new Set();
    this.animals = [];     // 鸡
    this.pen = null;
    this.fishSpots = [];
    this.sim = null;

    this._genTerrain();
    this._genStructures();
    this._genFarm();
    this._genNature();
    this._genProps();
    this._genDecor();
    this.fishSpots = [
      { x: 34.5, y: 14.1, name: '河边钓鱼台' },
      { x: 29.4, y: 38.6, name: '渔村码头' },
      { x: 29.4, y: 45.6, name: '清溪码头' },
    ];
  }

  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  tileAt(x, y) { return this.inBounds(x, y) ? this.tiles[this.idx(x, y)] : 3; }

  isBlocked(x, y) {
    if (!this.inBounds(x, y)) return true;
    return this.block[this.idx(x, y)] === 1;
  }

  // 脚下的“可站立代价”（用于寻路避让农田踩踏）
  tileCost(x, y) {
    if (!this.inBounds(x, y)) return Infinity;
    if (this.block[this.idx(x, y)]) return Infinity;
    const t = this.tiles[this.idx(x, y)];
    if (t === 3) return Infinity;
    if (t === 5) return 3;   // 尽量别踩农田
    return 1;
  }

  setTile(x, y, t) {
    if (!this.inBounds(x, y)) return;
    this.tiles[this.idx(x, y)] = t;
  }

  // ---------- 地形 ----------
  _genTerrain() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        this.variant[i] = Math.floor(rnd() * 4);
        this.tiles[i] = 0;
      }
    }
    // 右侧河流（只占 x36-39，东侧是后山林地）
    for (let y = 0; y < this.h; y++) {
      for (let x = 36; x <= 39; x++) {
        this.tiles[this.idx(x, y)] = 3;
        this.block[this.idx(x, y)] = 1;
      }
      // 河岸
      this.tiles[this.idx(35, y)] = 4;
      if (y % 2 === 0) this.waters.push([36, y]);
    }
    // 池塘（西侧）
    for (let y = 11; y <= 16; y++) {
      for (let x = 1; x <= 6; x++) {
        const d = Math.hypot(x - 3.5, y - 13.5);
        if (d < 3.2) {
          this.tiles[this.idx(x, y)] = 3;
          this.block[this.idx(x, y)] = 1;
          if (rnd() < 0.35) this.waters.push([x, y]);
        } else if (d < 4.1) {
          this.tiles[this.idx(x, y)] = 4;
        }
      }
    }
    // 南边的小水塘
    for (let y = 26; y <= 29; y++) {
      for (let x = 1; x <= 5; x++) {
        const d = Math.hypot(x - 3, y - 27.5);
        if (d < 2.3) {
          this.tiles[this.idx(x, y)] = 3;
          this.block[this.idx(x, y)] = 1;
          this.waters.push([x, y]);
        } else if (d < 3.1 && this.inBounds(x, y)) {
          this.tiles[this.idx(x, y)] = 4;
        }
      }
    }
    // 小路
    const path = (x0, y0, x1, y1) => {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
          if (this.tileAt(x, y) !== 3) this.tiles[this.idx(x, y)] = 2;
        }
      }
    };
    path(0, 2, 26, 2);       // 主路（北上）
    path(7, 2, 7, 9);        // 通农舍
    path(7, 8, 22, 8);       // 农田北侧
    path(22, 2, 22, 10);     // 通农田东侧
    path(17, 5, 17, 12);     // 通集市/广场
    path(17, 5, 30, 5);      // 通集市
    path(28, 5, 28, 7);
    path(11, 8, 11, 12);
    path(30, 5, 30, 13);
    path(3, 3, 3, 10);       // 西侧
    path(3, 3, 6, 3);
    path(22, 9, 26, 9);      // 小伟家门前的小路
    // 南边：主路延伸 + 横向村道 + 果园/谷仓岔路
    path(22, 10, 22, 29);
    path(6, 25, 34, 25);
    path(10, 25, 10, 26);    // 果园门口
    // 集市前的石砖小广场
    for (let y = 10; y <= 11; y++) {
      for (let x = 27; x <= 32; x++) {
        if (this.tileAt(x, y) !== 3) this.tiles[this.idx(x, y)] = 6;
      }
    }
    // 田埂小路
    for (let y = 8; y <= 17; y++) this.tiles[this.idx(14, y)] = 2;
    for (let x = 7; x <= 21; x++) { this.tiles[this.idx(x, 12)] = 2; this.tiles[this.idx(x, 15)] = 2; }

    // ---- 南边渔村：湖湾 ----
    for (let y = 33; y <= 41; y++) {
      for (let x = 29; x <= 35; x++) {
        if (x >= 30 && y >= 34) {
          this.tiles[this.idx(x, y)] = 3;
          this.block[this.idx(x, y)] = 1;
          this.waters.push([x, y]);
        } else if (x === 29 || y === 33) {
          this.tiles[this.idx(x, y)] = 4;
        }
      }
    }
    // 渔村道路
    path(22, 30, 22, 41);
    path(8, 30, 22, 30);
    path(8, 35, 29, 35);
    path(8, 39, 29, 39);

    // ---- 后山林地：过河桥 + 林道 ----
    for (let x = 36; x <= 39; x++) {
      this.tiles[this.idx(x, 13)] = 2;
      this.block[this.idx(x, 13)] = 0;
    }
    path(36, 13, 63, 13);    // 过桥后的主林道
    path(48, 4, 48, 13);     // 北侧支路
    path(56, 4, 56, 13);     // 矿洞支路
    path(44, 16, 52, 16);    // 伐木营地
    // 桥头闸门（后山解锁前挡住）
    this.block[this.idx(39, 13)] = 1;

    // ---- 清溪河岸：河道 + 磨坊路 ----
    for (let y = 42; y <= 51; y++) {
      for (let x = 29; x <= 35; x++) {
        if (x >= 30) {
          this.tiles[this.idx(x, y)] = 3;
          this.block[this.idx(x, y)] = 1;
          this.waters.push([x, y]);
        } else {
          this.tiles[this.idx(x, y)] = 4;
        }
      }
    }
    path(22, 42, 22, 51);
    path(22, 44, 29, 44);
    path(10, 46, 29, 46);
    path(14, 48, 26, 48);
    path(57, 7, 57, 13);
  }

  // ---------- 建筑 ----------
  addStruct(s) {
    s.id = s.id || `s${this.structures.length}`;
    this.structures.push(s);
    if (s.type === 'house' || s.type === 'shed' || s.type === 'barn') this.buildings.push(s);
    return s;
  }

  _genStructures() {
    const S = (o) => this.addStruct(o);

    S({ type: 'house', id: 'home_afu', name: '村屋', x: 8, y: 2, w: 5, h: 4, roof: C.roofRed, roof2: C.roofRed2, door: 10, sign: '屋' });
    S({ type: 'house', id: 'home_xiaowei', name: '小伟家', x: 23, y: 6, w: 4, h: 3, roof: '#7a5a8a', roof2: '#654a74', door: 25, sign: '家' });
    S({ type: 'house', id: 'home_xiaoman', name: '村屋', x: 23, y: 11, w: 4, h: 3, roof: C.roofBlue, roof2: C.roofBlue2, door: 25, sign: '屋' });
    S({ type: 'house', id: 'home_tiezhu', name: '村屋', x: 23, y: 15, w: 4, h: 3, roof: C.roofBrown, roof2: C.roofBrown2, door: 25, sign: '屋' });
    S({ type: 'house', id: 'home_chunxing', name: '村屋', x: 29, y: 15, w: 4, h: 3, roof: C.roofGreen, roof2: C.roofGreen2, door: 31, sign: '屋' });
    S({ type: 'house', id: 'home_ahai', name: '村屋', x: 8, y: 36, w: 4, h: 3, roof: '#5f7fa8', roof2: '#4c6a90', door: 10, sign: '屋' });
    S({ type: 'market', id: 'fishmarket', name: '鱼市', x: 24, y: 32, w: 5, h: 2.4 });
    S({ type: 'shed', id: 'shed', name: '农舍', x: 2, y: 5, w: 4, h: 3, roof: C.roofBrown, roof2: C.roofBrown2, door: 4, sign: '仓' });
    S({ type: 'market', id: 'market', name: '集市', x: 27, y: 8, w: 6, h: 2.4, crate: true });
    S({ type: 'well', id: 'well', name: '水井', x: 18, y: 17, w: 2, h: 2 });
    S({ type: 'sign', id: 'townsign', name: '田园小镇', x: 9, y: 1, w: 1, h: 1 });
    S({ type: 'dock', id: 'dock', name: '钓鱼台', x: 34, y: 12, w: 2, h: 2 });
    S({ type: 'barn', id: 'barn', name: '谷仓', x: 26, y: 22, w: 6, h: 3, roof: '#8a6a4a', roof2: '#6b523a', door: 29, sign: '谷' });
    S({ type: 'windmill', id: 'windmill', name: '风车', x: 16, y: 26, w: 4, h: 3, door: 18 });
    S({ type: 'house', id: 'loggingcamp', name: '伐木营地', x: 44, y: 17, w: 4, h: 3, roof: C.roofBrown, roof2: C.roofBrown2, door: 46, sign: '木' });
    S({ type: 'mine', id: 'mine', name: '后山矿洞', x: 56, y: 5, w: 3, h: 2 });
    S({ type: 'windmill', id: 'mill', name: '清溪磨坊', x: 14, y: 43, w: 4, h: 3, door: 16 });

    // 门统一在墙底行居中
    for (const b of this.buildings) {
      b.door = b.x + Math.floor(b.w / 2);
      // 门口下方铺路
      const dy = b.y + b.h;
      if (this.inBounds(b.door, dy)) {
        this.tiles[this.idx(b.door, dy)] = 2;
        this.tiles[this.idx(b.door - 1, dy)] = this.tiles[this.idx(b.door - 1, dy)] === 0 ? 2 : this.tiles[this.idx(b.door - 1, dy)];
      }
    }

    // 阻挡格子
    for (const s of this.structures) {
      if (s.type === 'sign' || s.type === 'dock') continue;
      if (s.type === 'market') {
        for (let x = s.x; x < s.x + s.w; x++) this._block(x, Math.floor(s.y));
        continue;
      }
      if (s.type === 'well') {
        for (let y = s.y; y < s.y + 2; y++)
          for (let x = s.x; x < s.x + 2; x++) this._block(x, y);
        continue;
      }
      // 房屋：挡住屋顶与墙体；门口下方一格可通行
      for (let y = s.y; y < s.y + s.h; y++)
        for (let x = s.x; x < s.x + s.w; x++) this._block(x, y);
      const dy = s.y + s.h;
      if (this.inBounds(s.door, dy)) this.block[this.idx(s.door, dy)] = 0;
    }
  }

  _block(x, y) {
    if (!this.inBounds(x, y)) return;
    this.block[this.idx(x, y)] = 1;
  }

  // ---------- 农田 ----------
  _genFarm() {
    this.farmRect = { x0: 8, y0: 9, x1: 21, y1: 18 };
    // 地块 7 列 × 4 行
    const cols = 7, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 8 + c * 2;
        const y = 9 + r * 2;
        const tile = this.tiles[this.idx(x, y)];
        if (tile === 2) continue;
        this.tiles[this.idx(x, y)] = 5;
        const plot = {
          id: this.plots.length,
          x, y,
          state: 'grass',         // grass | plowed
          crop: null,
          wetUntil: 0,
          createdAt: 0,
        };
        this.plots.push(plot);
        this.plotMap.set(`${x},${y}`, plot);
      }
    }
    // 农田边缘放几块石头/草丛装饰
    this.farmPlots = this.plots;
  }

  plotAt(x, y) { return this.plotMap.get(`${x},${y}`) || null; }

  // ---------- 自然物 ----------
  _pickTreeKind(x, y, fruit) {
    if (fruit === 'apple') return 'apple';
    const h = (((x * 73856093) ^ (y * 19349663)) >>> 0) / 4294967296;
    if (x >= 40) return h < 0.56 ? 'pine' : h < 0.78 ? 'birch' : h < 0.94 ? 'oak' : 'dead';
    const waterNear = (x <= 7 && y >= 10 && y <= 17) || (x <= 5 && y >= 25 && y <= 29) || (x >= 28 && y >= 33);
    if (waterNear) return h < 0.48 ? 'willow' : h < 0.8 ? 'birch' : 'oak';
    return h < 0.48 ? 'oak' : h < 0.7 ? 'birch' : h < 0.86 ? 'oak' : h < 0.95 ? 'willow' : 'dead';
  }

  addTree(x, y, size, fruit, kind) {
    const t = {
      id: `t${this.trees.length}`, x, y, size: size || 1, regrowAt: 0, fruit: fruit || null,
      kind: kind || this._pickTreeKind(x, y, fruit),
      seed: (((x * 2654435761) ^ (y * 40503)) >>> 0) / 4294967296,
    };
    this.trees.push(t);
    this._block(x, y);
    return t;
  }

  _genNature() {
    const trees = [
      [1, 5], [1, 7], [1, 9], [1, 17], [1, 19], [2, 20], [4, 19], [6, 20], [8, 19],
      [10, 20], [12, 20], [14, 20], [16, 20], [18, 20], [20, 20], [24, 20],
      [26, 20], [28, 20], [30, 20], [32, 20], [33, 18], [33, 16], [33, 6], [33, 4],
      [33, 3], [31, 1], [29, 1], [27, 1], [17, 1], [15, 1], [13, 1], [12, 4], [1, 21],
      [24, 22], [20, 22],
      // 南边新区域
      [2, 24], [4, 23], [7, 23], [12, 23], [15, 23], [23, 29], [20, 29], [33, 27], [35, 27],
      [3, 22],
      // 南边渔村
      [2, 31], [4, 34], [6, 37], [2, 40], [15, 31], [19, 31], [26, 31],
      [24, 41], [27, 41], [18, 41], [16, 40], [33, 31],
    ];
    for (const [x, y] of trees) {
      if (this.isBlocked(x, y) || this.tileAt(x, y) === 3) continue;
      if (this.tiles[this.idx(x, y)] === 2) continue;
      this.addTree(x, y, rnd() < 0.5 ? 1 : 2);
    }
    // 果园：会结果的苹果树
    for (const [x, y] of [[7, 27], [10, 27], [13, 27], [8, 28], [11, 28]]) {
      if (this.isBlocked(x, y) || this.tileAt(x, y) === 3 || this.tiles[this.idx(x, y)] === 2) continue;
      this.addTree(x, y, 2, 'apple');
    }
    // 石头
    for (const [x, y] of [[6, 11], [19, 2], [26, 17], [31, 8], [2, 2], [11, 4], [21, 13], [9, 18]]) {
      if (this.isBlocked(x, y) || this.tiles[this.idx(x, y)] === 3) continue;
      if (this.tiles[this.idx(x, y)] === 2) continue;
      this.rocks.push({ x, y, size: rnd() < 0.5 ? 1 : 2, mined: false, regrowAt: 0, ore: false });
      this._block(x, y);
    }
    // 可采集物（蘑菇/野莓）
    for (const [x, y] of [[5, 4], [13, 18], [25, 3], [32, 11], [4, 17], [19, 11]]) {
      if (this.isBlocked(x, y)) continue;
      this.forages.push({ x, y, kind: rnd() < 0.5 ? 'mushroom' : 'berry', taken: false, regrowAt: 0 });
    }

    // ---- 后山林地：成片松树 ----
    const forestTrees = [
      [41, 2], [43, 5], [45, 3], [47, 7], [50, 2], [52, 5], [54, 3], [59, 2], [61, 5], [62, 9],
      [42, 9], [45, 10], [50, 9], [53, 11], [59, 10], [61, 12],
      [42, 14], [47, 15], [50, 14], [53, 15], [58, 15], [60, 17], [62, 15],
      [41, 20], [44, 21], [48, 20], [51, 22], [54, 20], [57, 21], [60, 20], [62, 22],
      [42, 26], [45, 27], [49, 25], [52, 27], [55, 25], [58, 27], [61, 26],
      [41, 32], [44, 33], [47, 31], [50, 33], [53, 31], [56, 33], [59, 31], [62, 33],
      [42, 38], [45, 39], [48, 37], [51, 39], [54, 37], [57, 39], [60, 37], [62, 39],
      [41, 44], [44, 45], [47, 43], [50, 45], [53, 43], [56, 45], [59, 43], [62, 45],
      [42, 49], [45, 50], [48, 48], [51, 50], [54, 48], [57, 50], [60, 48], [62, 50],
    ];
    for (const [x, y] of forestTrees) {
      if (!this.inBounds(x, y) || this.isBlocked(x, y)) continue;
      if (this.tileAt(x, y) === 3 || this.tiles[this.idx(x, y)] === 2) continue;
      this.addTree(x, y, rnd() < 0.55 ? 2 : 1);
    }
    // 额外针叶树，让林地更密
    for (const [x, y] of [
      [42, 3], [44, 7], [46, 11], [49, 2], [51, 6], [53, 3], [55, 10], [57, 2], [59, 7], [61, 3], [62, 12],
      [41, 17], [43, 23], [45, 18], [47, 25], [49, 21], [51, 18], [53, 23], [55, 21], [57, 17], [59, 19], [61, 23], [62, 27],
      [41, 36], [43, 41], [45, 47], [47, 35], [49, 49], [51, 44], [53, 47], [55, 41], [57, 47], [59, 45], [61, 49], [62, 43],
    ]) {
      if (!this.inBounds(x, y) || this.isBlocked(x, y)) continue;
      if (this.tileAt(x, y) === 3 || this.tiles[this.idx(x, y)] === 2) continue;
      this.addTree(x, y, 2, null, 'pine');
    }
    // 水边垂柳
    for (const [x, y] of [[7, 12], [2, 24], [28, 33], [28, 36], [27, 43], [28, 50]]) {
      if (!this.inBounds(x, y) || this.isBlocked(x, y)) continue;
      if (this.tileAt(x, y) === 3 || this.tiles[this.idx(x, y)] === 2) continue;
      this.addTree(x, y, 2, null, 'willow');
    }
    // 后山矿点
    const forestRocks = [
      [50, 6], [52, 8], [54, 6], [58, 8], [60, 4], [43, 8], [46, 4], [61, 10],
      [49, 12], [55, 18], [47, 23], [58, 24], [44, 30], [52, 35], [60, 42], [46, 48],
    ];
    for (const [x, y] of forestRocks) {
      if (!this.inBounds(x, y) || this.isBlocked(x, y)) continue;
      if (this.tileAt(x, y) === 3 || this.tiles[this.idx(x, y)] === 2) continue;
      this.rocks.push({ x, y, size: 2, mined: false, regrowAt: 0, ore: rnd() < 0.45 });
      this._block(x, y);
    }
    // 后山采集点
    for (const [x, y] of [[41, 4], [46, 2], [49, 5], [53, 9], [57, 10], [60, 14], [43, 19], [52, 21], [59, 25], [45, 35], [56, 40], [49, 46]]) {
      if (!this.inBounds(x, y) || this.isBlocked(x, y) || this.tileAt(x, y) === 3) continue;
      this.forages.push({ x, y, kind: rnd() < 0.6 ? 'mushroom' : 'berry', taken: false, regrowAt: 0 });
    }
  }

  // ---------- 村庄小物件 / 围栏 / 鸡 ----------
  _genProps() {
    const prop = (type, x, y, extra = {}) => this.props.push({ type, x, y, ...extra });
    const fence = (x, y) => {
      if (!this.inBounds(x, y)) return;
      this.fences.add(`${x},${y}`);
      this.block[this.idx(x, y)] = 1;
    };
    const fenceRect = (x, y, w, h, gates = []) => {
      for (let i = 0; i < w; i++) { fence(x + i, y); fence(x + i, y + h - 1); }
      for (let j = 1; j < h - 1; j++) { fence(x, y + j); fence(x + w - 1, y + j); }
      for (const [gx, gy] of gates) {
        this.fences.delete(`${gx},${gy}`);
        if (this.inBounds(gx, gy)) this.block[this.idx(gx, gy)] = 0;
      }
    };

    // 果园和鸡圈
    fenceRect(6, 26, 9, 4, [[10, 26]]);
    fenceRect(32, 21, 4, 4, [[33, 24]]);
    this.pen = { x0: 33, y0: 22, x1: 34.75, y1: 23.85 };

    // 路灯
    for (const [x, y] of [[6, 4], [15, 4], [21, 4], [6, 9], [15, 9], [21, 7], [29, 6], [31, 10], [23, 10], [25, 26], [10, 24], [31, 20]]) {
      prop('lantern', x, y);
    }
    // 花坛
    for (const [x, y] of [[8, 6], [12, 6], [14, 3], [21, 10], [29, 14], [26, 18], [24, 26]]) {
      prop('flowerbed', x, y);
    }
    // 长椅
    for (const [x, y] of [[15, 10], [19, 10], [31, 10], [20, 27]]) prop('bench', x, y);
    // 木箱 / 木桶 / 草垛
    for (const [x, y] of [[33, 9], [33, 10], [1, 8], [1, 9], [30, 26]]) prop('crate', x, y);
    for (const [x, y] of [[2, 8], [32, 11], [5, 25]]) prop('barrel', x, y);
    for (const [x, y] of [[25, 26], [31, 26], [24, 23]]) prop('haystack', x, y);
    // 稻草人
    for (const [x, y] of [[12, 19], [20, 18]]) prop('scarecrow', x, y);
    // 晾衣绳 / 信箱 / 路牌
    for (const [x, y] of [[9, 6], [30, 18]]) prop('clothesline', x, y);
    for (const [x, y] of [[26, 10], [11, 6]]) prop('mailbox', x, y);
    for (const [x, y] of [[22, 9], [7, 10]]) prop('signpost', x, y);
    // 灌木
    for (const [x, y] of [[6, 7], [13, 7], [21, 14], [31, 13], [5, 17], [25, 10]]) prop('bush', x, y);
    // 水边芦苇 / 睡莲
    for (const [x, y] of [[5, 26], [5, 29], [0, 27], [3, 25]]) prop('reeds', x, y);
    for (const [x, y] of [[2, 27], [3, 28], [1, 26]]) prop('lily', x, y);
    // 营地篝火
    prop('campfire', 21, 27);
    // 每日委托板（集市旁）
    prop('questboard', 33, 11);
    // 服装店（集市东侧）
    prop('clothshop', 33, 5);
    // ---- 南边渔村 ----
    for (const [x, y] of [[21, 31], [14, 34], [26, 34], [28, 38]]) prop('lantern', x, y);
    for (const [x, y] of [[23, 36], [27, 34]]) prop('crate', x, y);
    prop('barrel', 25, 36);
    for (const [x, y] of [[20, 38], [12, 40]]) prop('bench', x, y);
    for (const [x, y] of [[7, 34], [18, 36], [26, 38]]) prop('bush', x, y);
    for (const [x, y] of [[28, 36], [29, 41], [30, 32]]) prop('reeds', x, y);
    for (const [x, y] of [[31, 36], [33, 39], [32, 40]]) prop('lily', x, y);
    prop('fishrack', 21, 33);
    prop('pier', 29, 38);
    prop('flowerbed', 12, 36);
    prop('flowerbed', 24, 39);
    prop('signpost', 22, 35);
    // ---- 后山林地 ----
    prop('bridge', 36, 13);
    prop('gate', 39, 13);
    for (const [x, y] of [[44, 13], [52, 13], [56, 8], [46, 16]]) prop('lantern', x, y);
    for (const [x, y] of [[45, 16], [51, 16]]) prop('crate', x, y);
    prop('campfire', 49, 18);
    prop('signpost', 40, 12);
    prop('logs', 48, 15);
    // ---- 清溪河岸 ----
    for (const [x, y] of [[29, 43], [28, 47], [29, 50]]) prop('reeds', x, y);
    for (const [x, y] of [[31, 44], [33, 48], [32, 50]]) prop('lily', x, y);
    prop('bench', 24, 47);
    prop('fishrack', 25, 45);
    prop('flowerbed', 18, 47);
    prop('pier', 29, 45);
    // ---- 植被多样性 ----
    for (const [x, y] of [[41, 10], [43, 15], [45, 22], [47, 30], [49, 40], [51, 47], [53, 20], [55, 35], [57, 44], [59, 12], [61, 28]]) prop('fern', x, y);
    for (const [x, y] of [[42, 7], [44, 19], [46, 30], [50, 42], [54, 12], [58, 22], [60, 46]]) prop('mushroom', x, y);
    for (const [x, y] of [[43, 25], [47, 41], [51, 10], [55, 30], [59, 38], [62, 18]]) prop('berrybush', x, y);
    for (const [x, y] of [[28, 43], [29, 47], [30, 50], [27, 44], [31, 48]]) prop('cattail', x, y);
    for (const [x, y] of [[2, 14], [5, 18], [9, 23], [20, 24], [28, 29], [30, 31], [24, 30], [12, 31], [16, 34], [6, 39]]) prop('grass', x, y);
    for (const [x, y] of [[23, 10], [10, 7], [18, 14], [26, 25], [3, 20], [31, 29], [13, 35], [22, 40], [25, 42], [12, 45]]) prop('wildflowers', x, y);
    for (const [x, y] of [[42, 11], [48, 18], [52, 26], [57, 31], [60, 36], [5, 20], [27, 24]]) prop('sapling', x, y);
    for (const [x, y] of [[26, 44], [24, 49], [44, 12], [54, 24], [58, 34], [7, 22], [19, 30]]) prop('herb', x, y);

    // 鸡圈里的鸡
    for (let i = 0; i < 3; i++) {
      this.animals.push({
        kind: 'chicken',
        x: 33.3 + Math.random() * 1.2,
        y: 22.2 + Math.random() * 1.3,
        dir: 'right',
        t: Math.random() * 3,
        tx: 33.4 + Math.random() * 1.1,
        ty: 22.3 + Math.random() * 1.2,
        peck: Math.random() * 2,
        home: this.pen,
        speed: 0.5,
        product: 'egg',
        produceEvery: 10,
        produceT: Math.random() * 4,
        ready: false,
      });
    }
    // 小鸡
    for (let i = 0; i < 2; i++) {
      this.animals.push({
        kind: 'chick', x: 33.5 + Math.random(), y: 22.5 + Math.random(),
        dir: 'right', t: Math.random() * 2, tx: 33.5, ty: 22.6, peck: Math.random() * 2,
        home: this.pen, speed: 0.6, young: true, product: null, produceEvery: 0, ready: false,
      });
    }

    // 牧场：牛、羊（谷仓南侧）
    this.pasture = { x0: 27, y0: 25.5, x1: 31.2, y1: 29.2 };
    const addPasture = (kind, opt = {}) => this.animals.push({
      kind,
      x: 28 + Math.random() * 5, y: 26 + Math.random() * 2.6,
      dir: 'right', t: Math.random() * 3, tx: 28, ty: 26,
      peck: Math.random() * 2, home: this.pasture,
      speed: opt.speed || 0.32, young: !!opt.young,
      product: opt.product || null, produceEvery: opt.produceEvery || 12,
      produceT: Math.random() * 5, ready: false,
    });
    addPasture('cow', { product: 'milk', produceEvery: 12 });
    addPasture('cow', { product: 'milk', produceEvery: 12 });
    addPasture('calf', { young: true, speed: 0.4 });
    addPasture('sheep', { product: 'wool', produceEvery: 16 });
    addPasture('sheep', { product: 'wool', produceEvery: 16 });
    addPasture('lamb', { young: true, speed: 0.38 });

    // 水边：鸭和鹅
    const waterHome = { x0: 27, y0: 34, x1: 29.3, y1: 40 };
    const addWaterBird = (kind, opt = {}) => this.animals.push({
      kind, x: 27.5 + Math.random() * 1.5, y: 35 + Math.random() * 4,
      dir: 'right', t: Math.random() * 3, tx: 28, ty: 36, peck: Math.random() * 2,
      home: waterHome, speed: opt.speed || 0.4, young: !!opt.young,
      product: opt.product || 'egg', produceEvery: opt.produceEvery || 12,
      produceT: Math.random() * 4, ready: false,
    });
    addWaterBird('duck', { product: 'egg', produceEvery: 11 });
    addWaterBird('duck', { product: 'egg', produceEvery: 11 });
    addWaterBird('duckling', { young: true, product: null });
    addWaterBird('goose', { speed: 0.38, product: 'egg', produceEvery: 13 });

    // 村里的猫和狗
    const villageHome = { x0: 10, y0: 5, x1: 30, y1: 20 };
    for (const kind of ['cat', 'dog']) {
      this.animals.push({
        kind, x: 12 + Math.random() * 14, y: 6 + Math.random() * 12,
        dir: 'right', t: Math.random() * 3, tx: 14, ty: 10, peck: 0,
        home: villageHome, speed: kind === 'cat' ? 0.55 : 0.5,
        product: null, produceEvery: 0, produceT: 0, ready: false,
      });
    }
  }

  _genDecor() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const t = this.tiles[this.idx(x, y)];
        if (t === 0 && rnd() < 0.10) {
          this.decor.push({ x: x + rnd() * 0.7, y: y + rnd() * 0.7, kind: rnd() < 0.5 ? 'tuft' : 'pebble' });
        }
        const meadow = y >= 24;
        if (t === 0 && rnd() < (meadow ? 0.085 : 0.035)) {
          this.flowers.push({ x: x + rnd() * 0.8, y: y + rnd() * 0.8, c: ['#f4e04e', '#f08ab0', '#f6f2e8', '#a88ad8'][Math.floor(rnd() * 4)] });
        }
      }
    }
  }

  // ---------- 查询 ----------
  buildingById(id) { return this.structures.find((s) => s.id === id); }

  // 最近的若干空闲相邻格（按到 (tx,ty) 距离排序）
  adjacentTiles(tx, ty, range = 1) {
    const out = [];
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = tx + dx, y = ty + dy;
        if (this.tileCost(x, y) < Infinity) out.push({ x, y });
      }
    }
    out.sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty));
    return out;
  }

  // 用于“走到目标旁边”的落点：优先目标本身（如果可站），否则邻格
  standTiles(tx, ty, range = 1) {
    const out = [];
    if (this.tileCost(tx, ty) < Infinity) out.push({ x: tx, y: ty });
    out.push(...this.adjacentTiles(tx, ty, range));
    return out;
  }

  rockAt(x, y) {
    return this.rocks.find((r) => r.x === x && r.y === y) || null;
  }

  treeAt(x, y) {
    return this.trees.find((t) => t.x === x && t.y === y && t.regrowAt <= (this.sim ? this.sim.absHours : 0));
  }

  // 重置为存档数据
  applySnapshot(snap) {
    if (!snap) return;
    for (const p of snap.plots) {
      const plot = this.plotAt(p.x, p.y);
      if (!plot) continue;
      plot.state = p.state;
      plot.crop = p.crop;
      plot.wetUntil = p.wetUntil;
    }
    if (snap.trees) {
      for (const t of this.trees) {
        const s = snap.trees[t.id];
        if (s && s.regrowAt) t.regrowAt = s.regrowAt;
      }
    }
    if (snap.forages) {
      for (const f of this.forages) {
        const s = snap.forages[`${f.x},${f.y}`];
        if (s) { f.taken = s.taken; f.regrowAt = s.regrowAt; }
      }
    }
  }
}






















