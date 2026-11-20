// 情绪系统：每个村民一套独立的情绪向量
// 五种情绪 + 对东家的信任，各自按性格有不同的基线与反应强度。

export const EMO_KEYS = ['joy', 'anger', 'sadness', 'anxiety', 'fatigue'];

export const EMO_META = {
  joy:     { label: '喜悦', emoji: '😊', color: '#e8b84a', desc: '心里舒坦，干活有劲' },
  anger:   { label: '恼火', emoji: '😠', color: '#c0574a', desc: '憋着火，容易顶嘴' },
  sadness: { label: '低落', emoji: '😔', color: '#6a8ab0', desc: '提不起精神' },
  anxiety: { label: '不安', emoji: '😟', color: '#a88ad8', desc: '心里悬着事' },
  fatigue: { label: '疲惫', emoji: '😪', color: '#8a9a7a', desc: '身心都累' },
  calm:    { label: '平静', emoji: '🙂', color: '#8ec46a', desc: '没什么波澜' },
};

// 每个村民的性格底色：基线值越高，越容易处在那种状态；reactivity 是受刺激时的放大倍数
export const TEMPERAMENTS = {
  ahai: {
    baseline: { joy: 44, anger: 7, sadness: 7, anxiety: 5, fatigue: 12 },
    reactivity: { joy: 0.7, anger: 0.7, sadness: 0.6, anxiety: 0.5, fatigue: 0.9 },
    trust: 48,
    note: '海边长大，话少、耐得住性子；饿肚子会烦躁。',
  },
  xiaowei: {
    baseline: { joy: 55, anger: 8, sadness: 7, anxiety: 6, fatigue: 9 },
    reactivity: { joy: 1.15, anger: 0.8, sadness: 0.8, anxiety: 0.6, fatigue: 0.7 },
    trust: 60,
    note: '乐呵的后生，嘴甜心大；被冷落会闷，被夸就飘。',
  },
  xiaoyang: {
    baseline: { joy: 52, anger: 4, sadness: 8, anxiety: 12, fatigue: 8 },
    reactivity: { joy: 1.0, anger: 0.4, sadness: 1.1, anxiety: 1.25, fatigue: 0.7 },
    trust: 62,
    note: '温柔细致，容易替别人操心；一句重话能记很久。',
  },
  afu: {
    baseline: { joy: 46, anger: 5, sadness: 6, anxiety: 5, fatigue: 12 },
    reactivity: { joy: 0.8, anger: 0.7, sadness: 0.5, anxiety: 0.4, fatigue: 0.9 },
    trust: 62,
    note: '稳当，情绪起伏小；活干好了就高兴。',
  },
  xiaoman: {
    baseline: { joy: 58, anger: 6, sadness: 8, anxiety: 6, fatigue: 8 },
    reactivity: { joy: 1.15, anger: 0.6, sadness: 0.8, anxiety: 0.8, fatigue: 0.6 },
    trust: 55,
    note: '乐天话多，哄一哄就开心；被冷落会低落。',
  },
  tiezhu: {
    baseline: { joy: 38, anger: 14, sadness: 6, anxiety: 5, fatigue: 14 },
    reactivity: { joy: 0.7, anger: 1.4, sadness: 0.5, anxiety: 0.4, fatigue: 1.0 },
    trust: 48,
    note: '直脾气，饿了累了就容易上火。',
  },
  chunxing: {
    baseline: { joy: 50, anger: 4, sadness: 11, anxiety: 11, fatigue: 9 },
    reactivity: { joy: 1.0, anger: 0.4, sadness: 1.2, anxiety: 1.2, fatigue: 0.7 },
    trust: 58,
    note: '心细敏感，一点小事就会挂心。',
  },
  laojing: {
    baseline: { joy: 40, anger: 5, sadness: 7, anxiety: 4, fatigue: 11 },
    reactivity: { joy: 0.5, anger: 0.4, sadness: 0.5, anxiety: 0.4, fatigue: 0.7 },
    trust: 45,
    note: '淡泊，什么都淡淡的。',
  },
  ajin: {
    baseline: { joy: 42, anger: 7, sadness: 6, anxiety: 7, fatigue: 12 },
    reactivity: { joy: 0.7, anger: 0.7, sadness: 0.6, anxiety: 0.7, fatigue: 0.9 },
    trust: 50,
    note: '闷头干活，不太表露。',
  },
  generic: {
    baseline: { joy: 45, anger: 8, sadness: 8, anxiety: 8, fatigue: 10 },
    reactivity: { joy: 0.9, anger: 0.9, sadness: 0.9, anxiety: 0.9, fatigue: 0.9 },
    trust: 50,
    note: '普通人的情绪。',
  },
};

// 事件对情绪的影响（会乘以该村民对应情绪的 reactivity）
export const FEEL_EVENTS = {
  greet:            { joy: 2 },
  smalltalk:        { joy: 2, anxiety: -1 },
  care:             { joy: 6, fatigue: -6, trust: 3 },
  praise:           { joy: 10, trust: 4 },
  gift:             { joy: 9, trust: 5, anger: -3 },
  apologize:        { anger: -16, trust: 5 },
  joke_ok:          { joy: 8 },
  joke_bad:         { anger: 5, trust: -1 },
  spam:             { anger: 4, joy: -2, trust: -1 },
  work_liked:       { joy: 8, trust: 1 },
  work_normal:      { joy: 2 },
  work_disliked:    { anger: 6, fatigue: 3 },
  harvest:          { joy: 7 },
  forced:           { anger: 7, trust: -3 },
  refused:          { anger: 5, sadness: 3, trust: -4 },
  hungry:           { anger: 3, fatigue: 2 },
  tired:            { fatigue: 4, joy: -2 },
  lonely:           { sadness: 3 },
  chat_friend:      { joy: 5, sadness: -3, anxiety: -2 },
  eat:              { joy: 4, anger: -2 },
  rest:             { fatigue: -10, joy: 2 },
  overwork:         { fatigue: 6, anger: 3 },
  morning:          { joy: 4, fatigue: -12 },
  night:            { fatigue: 5 },
  rain:             { joy: 2, anxiety: -1 },
  storm:            { anger: 4, anxiety: 6, fatigue: 2 },
};

export function createEmotions(id) {
  const t = TEMPERAMENTS[id] || TEMPERAMENTS.generic;
  const cur = {};
  for (const k of EMO_KEYS) cur[k] = clamp(t.baseline[k] + (Math.random() * 8 - 4));
  return {
    baseline: { ...t.baseline },
    reactivity: { ...t.reactivity },
    cur,
    trust: t.trust + (Math.random() * 6 - 3),
    log: [],
  };
}

function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

// 应用一次情绪刺激。mult 用于重复行为递减
export function applyFeel(emo, event, mult = 1) {
  const e = FEEL_EVENTS[event];
  if (!e) return;
  const now = Date.now();
  for (const k of EMO_KEYS) {
    if (e[k] === undefined) continue;
    const r = emo.reactivity[k] ?? 1;
    emo.cur[k] = clamp(emo.cur[k] + e[k] * r * mult);
  }
  if (e.trust !== undefined) emo.trust = clamp(emo.trust + e.trust * mult);
  emo.log.push({ event, at: now });
  if (emo.log.length > 40) emo.log.shift();
}

// 情绪自然回落 / 环境压力（每帧调用，dt 为秒）
export function tickEmotions(emo, dt, pressures = {}) {
  for (const k of EMO_KEYS) {
    const base = emo.baseline[k];
    const home = k === 'anger' ? 0.10 : k === 'fatigue' ? 0.05 : 0.06;
    emo.cur[k] += (base - emo.cur[k]) * home * dt;
  }
  // 环境压力（单位为“每秒”）
  if (pressures.hunger > 75) emo.cur.anger += 0.22 * dt;
  if (pressures.energy < 25) emo.cur.fatigue += 0.26 * dt;
  if (pressures.social < 25) emo.cur.sadness += 0.16 * dt;
  if (pressures.night) emo.cur.fatigue += 0.10 * dt;
  if (pressures.likedWork) emo.cur.joy += 0.16 * dt;
  if (pressures.dislikedWork) emo.cur.anger += 0.16 * dt;
  for (const k of EMO_KEYS) emo.cur[k] = clamp(emo.cur[k]);
  emo.trust = clamp(emo.trust + (50 - emo.trust) * 0.004 * dt);
}

// 当前最强烈的情绪
export function dominantEmotion(emo) {
  const c = emo.cur;
  if (c.anger > 58) return { key: 'anger', ...EMO_META.anger, value: c.anger };
  if (c.sadness > 55) return { key: 'sadness', ...EMO_META.sadness, value: c.sadness };
  if (c.anxiety > 55) return { key: 'anxiety', ...EMO_META.anxiety, value: c.anxiety };
  if (c.fatigue > 68) return { key: 'fatigue', ...EMO_META.fatigue, value: c.fatigue };
  if (c.joy > 60) return { key: 'joy', ...EMO_META.joy, value: c.joy };
  return { key: 'calm', ...EMO_META.calm, value: c.joy };
}

// 供 UI 展示：五种情绪 + 信任
export function emotionView(emo) {
  const dom = dominantEmotion(emo);
  return {
    dominant: dom,
    trust: Math.round(emo.trust),
    items: EMO_KEYS.map((k) => ({
      key: k,
      label: EMO_META[k].label,
      emoji: EMO_META[k].emoji,
      color: EMO_META[k].color,
      value: Math.round(emo.cur[k]),
      active: dom.key === k,
    })),
  };
}


