// 自主意愿：没被派活时，小伟和小杨会按自己的性格去做想做的事
import { CROPS } from './config.js';

const MARKET_SPOT = { x: 29.5, y: 10.6 };

function nearestProp(sim, type, v) {
  let best = null;
  let bd = Infinity;
  for (const p of sim.world.props) {
    if (p.type !== type) continue;
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function dryPlot(sim, v) {
  let best = null;
  let bd = Infinity;
  for (const p of sim.world.plots) {
    if (!p.crop || sim.isWet(p) || sim.cropReady(p)) continue;
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function emptyPlot(sim, v) {
  let best = null;
  let bd = Infinity;
  for (const p of sim.world.plots) {
    if (p.state !== 'plowed' || p.crop) continue;
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function doMarket(v, sim, d) {
  if (d.act === 'buy') {
    const def = CROPS[d.goods];
    if (!def) return;
    const n = sim.money >= def.seedCost * 2 ? 2 : 1;
    const r = sim.buySeed(d.goods, n);
    if (r && r.ok) {
      v.say(`买了${def.name}种子×${n}`, '🌱', 4.5);
      v.feel('work_liked');
      v.emo.cur.joy = Math.min(100, v.emo.cur.joy + 5);
      const text = `在集市买了${def.name}种子×${n}`;
      sim.addLog(`${v.name} ${text}`, 'buy');
      sim.emit('market', { villager: v, act: 'buy', text });
    } else {
      v.say('钱不太够，下次吧。', '😅', 4);
    }
  } else if (d.act === 'sell') {
    const have = sim.inventory[d.goods] || 0;
    const n = Math.min(have, 5);
    if (n <= 0) return;
    const gain = sim.itemPrice(d.goods) * n;
    const r = sim.sellItem(d.goods, n);
    if (r && r.ok) {
      v.say(`把${n}个${sim.itemName(d.goods)}卖了 +${gain}G`, '💰', 4.5);
      v.emo.cur.joy = Math.min(100, v.emo.cur.joy + 5);
      const text = `在集市卖了${n}个${sim.itemName(d.goods)} +${gain}G`;
      sim.emit('market', { villager: v, act: 'sell', text });
    }
  }
}

const DESIRES = [
  {
    id: 'riverside', label: '去河边坐坐', emoji: '🎣', who: ['xiaowei'],
    score(v, sim) {
      if (sim.isRainy) return 0.15;
      let s = 0.55 + v.personality.sociability * 0.2;
      if (v.emo.cur.fatigue > 45) s += 0.2;
      if (v.task) s -= 0.6;
      return s;
    },
    start(v, sim) {
      const spot = sim.nearestFishSpot(v);
      v.desire = { id: 'riverside', label: '去河边坐坐', kind: 'spot', x: spot.x, y: spot.y + 0.6, hold: 6, line: '河边风不错，坐会儿。' };
    },
  },
  {
    id: 'fish', label: '钓两条鱼', emoji: '🐟', who: ['xiaowei'],
    score(v, sim) {
      if (sim.isRainy || sim.weather === 'storm') return 0;
      if (sim.hour < 6 || sim.hour >= 20) return 0;
      return 0.45 + (v.likes.includes('fish') ? 0.25 : 0);
    },
    start(v) {
      v.desire = null;
      v.startSelfTask('fish');
    },
  },
  {
    id: 'snack', label: '找点吃的', emoji: '🍞', who: ['xiaowei', 'xiaoyang'],
    score(v) { return v.needs.hunger > 55 ? 0.5 + (v.needs.hunger - 55) / 100 : 0; },
    start(v) { v.desire = null; v.startSelfTask('eat'); },
  },
  {
    id: 'nap', label: '打个盹', emoji: '💤', who: ['xiaowei'],
    score(v) { return v.needs.energy < 58 ? 0.5 + (58 - v.needs.energy) / 120 : 0; },
    start(v) { v.desire = null; v.startSelfTask('rest'); },
  },
  {
    id: 'tend', label: '去照看庄稼', emoji: '💧', who: ['xiaoyang'],
    score(v, sim) {
      const dry = dryPlot(sim, v);
      const empty = emptyPlot(sim, v);
      if (!dry && !empty) return 0;
      return 0.6 + (v.likes.includes('water') ? 0.15 : 0);
    },
    start(v, sim) {
      const dry = dryPlot(sim, v);
      if (dry) { v.desire = null; v.startAutoTask({ type: 'water', tx: dry.x, ty: dry.y }); return; }
      const empty = emptyPlot(sim, v);
      if (empty && (sim.bestSeed() || sim.money >= 6)) {
        v.desire = null;
        v.startAutoTask({ type: 'plant', tx: empty.x, ty: empty.y });
        return;
      }
      v.desire = null;
    },
  },
  {
    id: 'flowers', label: '去看看花', emoji: '🌼', who: ['xiaoyang'],
    score(v, sim) {
      let s = 0.5 + (v.personality.tidiness || 0.5) * 0.2;
      if (sim.isRainy) s -= 0.2;
      return s;
    },
    start(v, sim) {
      const p = nearestProp(sim, 'flowerbed', v) || nearestProp(sim, 'wildflowers', v);
      const x = p ? p.x + 0.5 : v.x + 2;
      const y = p ? p.y + 1 : v.y + 1;
      v.desire = { id: 'flowers', label: '去看看花', kind: 'spot', x, y, hold: 5, line: '这几株开得真好。' };
    },
  },
  {
    id: 'tidy', label: '去收拾一下', emoji: '🧹', who: ['xiaoyang'],
    score(v) { return 0.45 + (v.personality.tidiness || 0.5) * 0.25; },
    start(v, sim) {
      const shed = sim.world.buildingById('shed');
      const x = shed ? shed.door + 0.5 : v.homePos.x;
      const y = shed ? shed.y + shed.h + 0.6 : v.homePos.y;
      v.desire = { id: 'tidy', label: '去收拾一下', kind: 'spot', x, y, hold: 5, line: '乱糟糟的，收拾一下心里才舒服。' };
    },
  },
  {
    id: 'buyseed', label: '去集市买种子', emoji: '🌱', who: ['xiaoyang'],
    score(v, sim) {
      if (sim.hour < 8 || sim.hour >= 18) return 0;
      const seeds = sim.getSeedCount();
      if (seeds > 2) return 0;
      const best = sim.bestSeed() || 'radish';
      if (sim.money < (CROPS[best]?.seedCost || 6)) return 0;
      if (seeds === 0) return 0.95;
      return 0.6 + (v.personality.tidiness || 0.5) * 0.2;
    },
    start(v, sim) {
      const best = sim.bestSeed();
      const goods = best || (sim.money >= 6 && sim.seasonAllows('radish') ? 'radish' : null);
      if (!goods) { v.desire = null; return; }
      v.desire = {
        id: 'buyseed', label: '去集市买种子', kind: 'market',
        x: MARKET_SPOT.x, y: MARKET_SPOT.y, act: 'buy', goods, hold: 2.5,
        line: '种子不多了，去集市看看。',
      };
    },
  },
  {
    id: 'sellgoods', label: '去集市卖点东西', emoji: '💰', who: ['xiaowei'],
    score(v, sim) {
      if (sim.hour < 8 || sim.hour >= 18) return 0;
      const sellable = Object.entries(sim.inventory)
        .filter(([k, n]) => n > 0 && k !== 'bread' && sim.itemPrice(k) > 0);
      if (!sellable.length) return 0;
      const total = sellable.reduce((a, [, n]) => a + n, 0);
      let s = 0.5;
      if (total >= 6) s += 0.15;
      if (total >= 8) s = 0.8;
      if (sim.money < 40) s = Math.max(s, 0.85);
      else if (sim.money < 60) s += 0.2;
      return s;
    },
    start(v, sim) {
      const sellable = Object.entries(sim.inventory)
        .filter(([k, n]) => n > 0 && k !== 'bread' && sim.itemPrice(k) > 0)
        .sort((a, b) => b[1] - a[1]);
      if (!sellable.length) { v.desire = null; return; }
      v.desire = {
        id: 'sellgoods', label: '去集市卖点东西', kind: 'market',
        x: MARKET_SPOT.x, y: MARKET_SPOT.y, act: 'sell', goods: sellable[0][0], hold: 2.5,
        line: '仓库堆着也是堆着，换点钱回来。',
      };
    },
  },
  {
    id: 'chat', label: '想找人说说话', emoji: '💬', who: ['xiaowei', 'xiaoyang'],
    score(v, sim) {
      if (v.needs.social > 70) return 0;
      return 0.4 + (v.personality.sociability || 0.5) * 0.3 + (70 - v.needs.social) / 200;
    },
    start(v, sim) {
      const other = sim.villagers.find((x) => x !== v && x.state !== 'sleeping' && !x.task);
      if (!other) { v.desire = null; return; }
      v.desire = null;
      v.startSelfTask('chat', { other });
    },
  },
  {
    id: 'stroll', label: '随便走走', emoji: '🚶', who: ['xiaowei', 'xiaoyang'],
    score(v, sim) { return 0.3 + (sim.isNight ? 0 : 0.1); },
    start(v, sim) {
      const spots = [
        [18.5, 10.5], [12.5, 6.5], [28.5, 9.5], [20.5, 24.5],
        [14.5, 34.5], [26.5, 27.5],
      ];
      const s = spots[Math.floor(Math.random() * spots.length)];
      v.desire = { id: 'stroll', label: '随便走走', kind: 'spot', x: s[0], y: s[1], hold: 3, line: '今天也是个好天气。' };
    },
  },
];

export function tickDesire(sim, v, dt) {
  // 正在做想做的事
  if (v.desire) {
    const d = v.desire;
    if (d.kind === 'spot' || d.kind === 'market') {
      const dist = Math.hypot(d.x - v.x, d.y - v.y);
      if (dist > 1.4) {
        if (!v.path) v._walkTo(d.x, d.y, 'desire');
        return true;
      }
      v.path = null;
      v.action = 'idle';
      v.state = 'auto';
      if (d.kind === 'market' && !d.done) {
        doMarket(v, sim, d);
        d.done = true;
        d.timer = d.hold;
      }
      d.timer = (d.timer ?? d.hold) - dt;
      if (Math.random() < 0.02) v.think(d.line, d.id === 'flowers' ? '🌼' : d.id === 'tidy' ? '🧹' : d.kind === 'market' ? '💰' : '🌿');
      if (d.timer <= 0) {
        if (d.id === 'riverside') { v.feel('rest'); v.needs.energy = Math.min(100, v.needs.energy + 8); }
        else if (d.id === 'flowers') { v.feel('praise'); v.emo.cur.joy = Math.min(100, v.emo.cur.joy + 6); }
        else if (d.id === 'tidy') { v.emo.cur.joy = Math.min(100, v.emo.cur.joy + 4); v.satisfaction = Math.min(100, v.satisfaction + 2); }
        else { v.emo.cur.joy = Math.min(100, v.emo.cur.joy + 3); }
        v.desire = null;
        v.desireCd = 6 + Math.random() * 9;
        v.idleT = 0.6;
      }
      return true;
    }
    v.desire = null;
  }

  v.desireCd = (v.desireCd ?? 4) - dt;
  if (v.desireCd > 0) return false;
  v.desireCd = 2.5 + Math.random() * 3;

  // 选一个最想做的事
  let best = null;
  let bestScore = 0.36;
  for (const d of DESIRES) {
    if (d.who && !d.who.includes(v.id)) continue;
    const s = d.score(v, sim) * (0.85 + Math.random() * 0.3);
    if (s > bestScore) { bestScore = s; best = d; }
  }
  if (!best) return false;
  best.start(v, sim);
  if (v.desire) v.desire.label = best.label;
  if (!v.task) {
    v.think(`${best.emoji} ${best.label}`, best.emoji);
  }
  return !!v.desire || !!v.task;
}


