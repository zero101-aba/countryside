// 田园小镇 — 全局配置与数值表
// 所有可调数值集中在这里，方便后续平衡与迭代。

export const TILE = 24;          // 逻辑像素下每格大小
export const PX = 3;             // 低分辨率缓冲的放大倍率（像素风）
export const MAP_W = 64;
export const MAP_H = 52;

export const SIM_DT = 1 / 60;

// 时间：1 游戏小时 = 2 秒真实时间（1 倍速）。一天 24 小时 ≈ 48 秒。
export const HOUR_SECONDS = 5.0;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_SEASON = 28;
export const SEASONS = ['春', '夏', '秋', '冬'];
export const SEASON_EN = ['spring', 'summer', 'autumn', 'winter'];

export const WAKE_HOUR = 6;
export const SLEEP_HOUR = 23;

// 村民移动速度（格/秒）
export const WALK_SPEED = 2.15;

// 作物表：grow 为需要的“生长小时”（只在湿润时累计）
export const CROPS = {
  radish:     { name: '萝卜',   seedCost: 6,  sell: 16,  grow: 8,  color: '#e46f8a', leaf: '#5aa946', seasons: [0, 2] },
  turnip:     { name: '芜菁',   seedCost: 10, sell: 28,  grow: 14, color: '#f2dd7a', leaf: '#4f9b3e', seasons: [0, 2] },
  carrot:     { name: '胡萝卜', seedCost: 16, sell: 46,  grow: 20, color: '#e8823c', leaf: '#58a84a', seasons: [0],    },
  strawberry: { name: '草莓',   seedCost: 30, sell: 92,  grow: 30, color: '#e0413f', leaf: '#3f8f3a', seasons: [0, 1] },
  pumpkin:    { name: '南瓜',   seedCost: 55, sell: 170, grow: 46, color: '#e89a2c', leaf: '#4a8c3a', seasons: [1, 2] },
};

export const WATER_HOLD_HOURS = 16; // 浇一次水保持湿润的游戏小时

// 指令类型
export const ORDERS = {
  plow:     { name: '开垦', verb: '开垦',   secs: 1.6, color: '#c98b52', icon: '⛏' },
  plant:    { name: '播种', verb: '播种',   secs: 1.0, color: '#7cc35a', icon: '🌱' },
  water:    { name: '浇水', verb: '浇水',   secs: 1.2, color: '#5ab8e0', icon: '💧' },
  harvest:  { name: '收获', verb: '收获',   secs: 1.4, color: '#f2b23a', icon: '🧺' },
  chop:     { name: '砍树', verb: '砍树',   secs: 3.4, color: '#b5783c', icon: '🪓' },
  fish:     { name: '钓鱼', verb: '钓鱼',   secs: 4.5, color: '#4aa6d8', icon: '🎣' },
  forage:   { name: '采集', verb: '采集',   secs: 1.6, color: '#c8d84a', icon: '🍄' },
  eat:      { name: '吃点东西', verb: '吃东西', secs: 1.6, color: '#e9843c', icon: '🍞' },
  rest:     { name: '原地歇会儿', verb: '休息', secs: 2.0, color: '#b8a2e0', icon: '💤' },
  chat:     { name: '去聊天', verb: '聊天', secs: 2.0, color: '#e88ab2', icon: '💬' },
  mine:     { name: '挖矿', verb: '挖矿', secs: 3.2, color: '#8a8a96', icon: '⛏' },
  collect:  { name: '收牧产', verb: '收牧产', secs: 2.2, color: '#d8b06a', icon: '🥚' },
};

export const ORDER_KEYS = Object.keys(ORDERS);

// 村民基础数据
export const VILLAGERS = [
  {
    // 男主：黑色连帽卫衣、浅色牛仔裤、蓬松黑发
    id: 'xiaowei', name: '小伟', role: '男主角', lead: true, house: 'home_xiaowei',
    skin: '#f0c9a8', hair: '#1c1a1a',
    shirt: '#2a2a30', pants: '#93aecb',
    hat: 'none', hatColor: '#ffffff', apron: false,
    hood: true, hoodColor: '#3a3a46', logo: '#e8e4dc', drawstrings: true,
    eyebrows: '#1c1a1a', spikes: true, hairStyle: 'spiky',
    boots: '#2a2a30', belt: '#4a4a52',
    personality: { diligence: 0.7, sociability: 0.85, appetite: 0.9, tidiness: 0.5 },
    likes: ['fish', 'forage', 'chat', 'harvest'], dislikes: ['chop'],
    speed: 1.05, workSpeed: 0.95,
    bio: '从城里回来的后生。脑子活、手脚慢，嘴甜，最爱在河边待着。',
    traits: ['嘴甜', '心宽', '爱清闲', '有点懒'], aspiration: '在河边待着，顺便钓两条鱼',
  },
  {
    // 女主：黑发丸子头 + 刘海、白T恤黑字、金色项链
    id: 'xiaoyang', name: '小杨', role: '女主角', lead: true, house: 'home_xiaowei',
    skin: '#f6d6c0', hair: '#241c22',
    shirt: '#f4efe6', pants: '#cfc7bd',
    hat: 'none', hatColor: '#ffffff', apron: false,
    bun: true, bangs: true, longHair: true, lips: '#c05a5a', hairStyle: 'bun',
    necklace: '#e8c060', logo: '#2a2428', hairpin: '#e8a0b0',
    accessory: 'earring', accessoryColor: '#e8c060', boots: '#cfc7bd',
    personality: { diligence: 0.9, sociability: 0.7, appetite: 0.5, tidiness: 0.95 },
    likes: ['plant', 'water', 'harvest', 'chat'], dislikes: ['chop', 'fish'],
    speed: 1.0, workSpeed: 1.05,
    bio: '手巧心细的姑娘。爱干净，见不得地里有杂草，说话轻声细语。',
    traits: ['心细', '爱干净', '认真', '嘴硬心软'], aspiration: '把地种好，把家里收拾干净',
  },
  {
    id: 'afu', name: '阿福', role: '农夫', house: 'home_afu', skin: '#f0c398', hair: '#5a3b23',
    shirt: '#d8b06a', pants: '#6c4a2e', hat: 'straw', hatColor: '#e0c070', apron: true, hairStyle: 'short',
    beard: 'stubble', beardColor: '#7a5a44', belt: '#6b4526', boots: '#5a4030',
    personality: { diligence: 0.95, sociability: 0.5, appetite: 0.8, tidiness: 0.8 },
    likes: ['plow', 'plant', 'water', 'harvest'], dislikes: ['fish'],
    speed: 1.0, workSpeed: 1.15,
    bio: '天不亮就醒的老把式。看见荒地就手痒，唯一讨厌的是在河边坐一整天。',
  },
  {
    id: 'xiaoman', name: '小满', role: '货郎', house: 'home_xiaoman', skin: '#e8bb90', hair: '#2f2a32',
    shirt: '#c25b4e', pants: '#4a4050', hat: 'cap', hatColor: '#8c3f36', apron: true, hairStyle: 'bob',
    accessory: 'scarf', accessoryColor: '#e8a04a', satchel: true, satchelColor: '#8a5c35', boots: '#4a4050',
    personality: { diligence: 0.45, sociability: 1.0, appetite: 0.6, tidiness: 0.4 },
    likes: ['fish', 'forage', 'chat'], dislikes: ['chop', 'plow'],
    speed: 1.1, workSpeed: 0.85,
    bio: '嘴比腿快，消息比货多。干重活会叹气，但只要有人搭话就来劲。',
  },
  {
    id: 'tiezhu', name: '铁柱', role: '樵夫', house: 'home_tiezhu', skin: '#d9a878', hair: '#3a2b1e',
    shirt: '#5d7a52', pants: '#4a4038', hat: 'none', hatColor: '#ffffff', apron: false, hairStyle: 'short',
    beard: 'full', beardColor: '#3a2b1e', vest: true, vestColor: '#445a3c', belt: '#4a4038', boots: '#3a2c22',
    personality: { diligence: 0.7, sociability: 0.3, appetite: 1.0, tidiness: 0.3 },
    likes: ['chop', 'plow'], dislikes: ['water', 'plant'],
    speed: 0.9, workSpeed: 1.25,
    bio: '一顿能吃三碗饭。砍树时最有精神，但饿了会毫不犹豫地罢工去吃饭。',
  },
  {
    id: 'chunxing', name: '春杏', role: '杂工', house: 'home_chunxing', skin: '#f2ccaa', hair: '#7a4526',
    shirt: '#d98aa8', pants: '#5a5a72', hat: 'none', hatColor: '#ffffff', apron: true, hairStyle: 'ponytail',
    bangs: true, tie: '#d98aa8', hairpin: '#f2a0c0', boots: '#5a5a72',
    personality: { diligence: 0.6, sociability: 0.9, appetite: 0.5, tidiness: 0.9 },
    likes: ['harvest', 'plant', 'chat', 'water'], dislikes: ['chop'],
    speed: 1.05, workSpeed: 1.0,
    bio: '爱笑的姑娘，什么都会一点。最怕一个人待着，边干活边哼歌。',
  },
  {
    // 南边渔村的新村民
    id: 'ahai', name: '阿海', role: '渔夫', house: 'home_ahai', skin: '#d9a878', hair: '#2a2420',
    shirt: '#4e6d8a', pants: '#3f4a56', hat: 'straw', hatColor: '#c9b884', apron: false,
    hairStyle: 'short', beard: 'stubble', beardColor: '#4a3a2a', boots: '#3a2c22',
    personality: { diligence: 0.6, sociability: 0.5, appetite: 0.9, tidiness: 0.6 },
    likes: ['fish', 'forage', 'chat'], dislikes: ['plow', 'chop'],
    speed: 0.95, workSpeed: 1.0,
    bio: '南边渔村的后生。天不亮就下网，话不多，但对水里的东西门儿清。',
  },
];

// 可雇佣的额外村民（商店解锁）
export const HIRE_POOL = [
  {
    id: 'laojing', name: '老井张', role: '渔翁', house: 'home_tiezhu', skin: '#e2b58a', hair: '#b8b8b0',
    shirt: '#4e6d8a', pants: '#3f4a56', hat: 'straw', hatColor: '#c9b884', apron: false, hairStyle: 'long',
    beard: 'long', beardColor: '#d8d8d0', boots: '#4a4038',
    personality: { diligence: 0.5, sociability: 0.4, appetite: 0.9, tidiness: 0.6 },
    likes: ['fish', 'forage'], dislikes: ['plow', 'chop'],
    speed: 0.85, workSpeed: 0.9,
    bio: '在河边坐三十年的人。不爱说话，但鱼篓从不空。',
    cost: 260,
  },
  {
    id: 'ajin', name: '阿金', role: '工匠', house: 'home_xiaoman', skin: '#ecc49c', hair: '#2a2a2a',
    shirt: '#8a6fa8', pants: '#3c3c4c', hat: 'cap', hatColor: '#5d4a7a', apron: true, hairStyle: 'short',
    accessory: 'glasses', accessoryColor: '#3a3a3a', vest: true, vestColor: '#6a5a8a', belt: '#3c3c4c', boots: '#3c3c4c',
    personality: { diligence: 0.85, sociability: 0.3, appetite: 0.7, tidiness: 0.7 },
    likes: ['chop', 'water', 'harvest'], dislikes: ['chat'],
    speed: 0.95, workSpeed: 1.1,
    bio: '手艺好、话少。给他一个活，他能一声不吭干到天黑。',
    cost: 420,
  },
];

// 经济
export const START_MONEY = 140;
export const START_SEEDS = { radish: 6, turnip: 2 };
export const WOOD_PRICE = 14;
export const FISH_PRICE = 34;

// 需求衰减（每游戏小时）
export const NEED_RATES = {
  hunger: 3.0,   // 吃饱到饿的速率（乘以食欲）
  energy: 3.6,   // 精力消耗（干活时 ×2.2）
  social: -2.6,  // 社交是“需求值”，越高越满足；独处时下降
};

// ---- 调色板 ----
export const C = {
  grass: '#79b45a', grass2: '#6aa44e', grass3: '#8cc46a', grassDark: '#5f9646',
  dirt: '#b98b57', dirt2: '#a97c4c', dirt3: '#c79a64',
  path: '#c7a878', path2: '#b8966a',
  sand: '#dcc48e', sand2: '#cbb37e',
  water: '#5b9bd0', water2: '#4a86bb', waterDeep: '#3f74a6', waterLight: '#8fc2e8',
  soil: '#7d5636', soilDry: '#8a6039', soilWet: '#5e3f28', soilLine: '#6a472c',
  wood: '#8a5c35', woodDark: '#6b4526', woodLight: '#a97a4a',
  wall: '#e8d6b0', wall2: '#d8c49c', wall3: '#c9b48c',
  roofRed: '#c0574a', roofRed2: '#a5443a', roofBlue: '#5f7fa8', roofBlue2: '#4c6a90',
  roofBrown: '#8a6a4a', roofBrown2: '#735539', roofGreen: '#5f8a5a', roofGreen2: '#4c7348',
  stone: '#b0a89a', stone2: '#968e80',
  leaf: '#4e8f3e', leaf2: '#3f7a33', leaf3: '#63a54c', leafDark: '#356a2a',
  trunk: '#7a5232', trunk2: '#5f3f26',
  white: '#fff8e8', black: '#1e1a16',
  gold: '#f2c14e', gold2: '#d8a02e',
  ui: '#2b2320', ui2: '#3a2f28',
};

export const NAMES = {
  market: '集市',
  shed: '农舍',
  well: '水井',
  sign: '田园小镇',
};





// 区域定义（无缝大世界分区）
export const REGIONS = [
  { id: 'market', name: '兴隆集市', x0: 24, y0: 6, x1: 34, y1: 14, color: '#e0a050', travel: { x: 29, y: 9 }, desc: '买卖、委托和集市摊位' },
  { id: 'village', name: '青禾村', x0: 0, y0: 0, x1: 35, y1: 29, color: '#8ecb63', travel: { x: 14, y: 12 }, desc: '村庄、农田、集市和谷仓' },
  { id: 'fishing', name: '河边渔村', x0: 0, y0: 30, x1: 39, y1: 41, color: '#5fb7a8', travel: { x: 25, y: 36 }, desc: '湖湾、鱼市和码头' },
  { id: 'river', name: '清溪河岸', x0: 0, y0: 42, x1: 29, y1: 51, color: '#6aa9c9', travel: { x: 27, y: 45 }, unlock: { day: 2 }, desc: '磨坊、麦田和芦苇荡' },
  { id: 'forest', name: '后山林地', x0: 40, y0: 0, x1: 63, y1: 51, color: '#3f7a4a', travel: { x: 46, y: 14 }, unlock: { harvest: 10 }, desc: '伐木、采集和矿洞' },
];







// 阶段解锁规则：每达成一个阶段，开放一块新玩法
export const STAGES = [
  { id: 's1', name: '落脚', cond: '收获 1 次', unlock: '每日委托板', feature: 'quests' },
  { id: 's2', name: '牧歌', cond: '播种 3 次', unlock: '牧场指令（收蛋/挤奶/剪羊毛）、夜晚自动跳过', feature: 'collect' },
  { id: 's3', name: '开市', cond: '累计收入 150G', unlock: '8× 速度', feature: 'speed8' },
  { id: 's4', name: '进山', cond: '累计收获 10 次', unlock: '后山林地与挖矿', feature: 'mine' },
  { id: 's5', name: '渔获', cond: '累计钓 5 条鱼', unlock: '鲜鱼售价 +20%', feature: 'fishBonus' },
  { id: 's6', name: '矿工', cond: '累计挖矿 10 次', unlock: '矿石售价 +30%', feature: 'oreBonus' },
  { id: 's7', name: '交心', cond: '小伟与小杨关系达到 60', unlock: 'AI 自动对话', feature: 'aiAuto' },
  { id: 's8', name: '走遍小镇', cond: '解锁全部 5 个区域', unlock: '小镇荣誉称号', feature: 'title' },
];

// 服装：每人 5 套新时装（default 为初始形象）
export const OUTFITS = {
  xiaowei: [
    { id: 'default', name: '回乡青年', price: 0, stage: 0, desc: '黑卫衣 + 牛仔裤' },
    { id: 'farm', name: '田间工装', price: 120, stage: 2, desc: '草帽 + 绿衬衫 + 围裙',
      c: { shirt: '#5f8f4a', pants: '#3f6b3a', hat: 'straw', hatColor: '#e0c070', apron: true, boots: '#5a4030' } },
    { id: 'fisher', name: '河畔渔夫', price: 260, stage: 3, desc: '鸭舌帽 + 灰马甲 + 挎包',
      c: { shirt: '#4e6d8a', pants: '#3f4a56', hat: 'cap', hatColor: '#2f4a5a', vest: true, vestColor: '#6a6a72', satchel: true, satchelColor: '#8a5c35', boots: '#2f3a44' } },
    { id: 'miner', name: '后山矿工', price: 420, stage: 4, desc: '黄安全帽 + 棕夹克',
      c: { shirt: '#8a6a4a', pants: '#3a3a40', hat: 'cap', hatColor: '#e8c040', belt: '#4a3a2a', boots: '#3a2c22' } },
    { id: 'festival', name: '节日礼服', price: 800, stage: 6, desc: '红马甲 + 金饰带',
      c: { shirt: '#f4efe6', pants: '#3a3a46', vest: true, vestColor: '#8a2f3a', tie: '#c8a020', boots: '#4a3a2a' } },
    { id: 'star', name: '小镇之星', price: 1500, stage: 8, desc: '金印黑卫衣 + 耳钉',
      c: { shirt: '#2a2a30', pants: '#93aecb', hood: true, hoodColor: '#3a3a46', logo: '#f2c14e', accessory: 'earring', accessoryColor: '#f2c14e', boots: '#2a2a30' } },
  ],
  xiaoyang: [
    { id: 'default', name: '白衫姑娘', price: 0, stage: 0, desc: '丸子头 + 白 T 恤' },
    { id: 'farm', name: '田间姑娘', price: 120, stage: 2, desc: '草帽 + 粉裙 + 围裙',
      c: { shirt: '#d98aa8', pants: '#a86a72', hat: 'straw', hatColor: '#e0c070', apron: true, hairpin: '#f2a0c0', boots: '#6b4a3a' } },
    { id: 'fisher', name: '河畔渔娘', price: 260, stage: 3, desc: '红头巾 + 青衫 + 网袋',
      c: { shirt: '#4e9a8a', pants: '#4a4038', accessory: 'scarf', accessoryColor: '#c25b4e', satchel: true, satchelColor: '#8a5c35', boots: '#3a3a40' } },
    { id: 'florist', name: '花房姑娘', price: 420, stage: 4, desc: '紫裙 + 花饰',
      c: { shirt: '#b8a0e0', pants: '#8a7ab8', apron: false, hairpin: '#f2a0c0', accessory: 'earring', accessoryColor: '#e8c060', boots: '#6b5a72' } },
    { id: 'festival', name: '节日红妆', price: 800, stage: 6, desc: '红裙 + 金发簪 + 项链',
      c: { shirt: '#a83232', pants: '#7a2a2a', hairpin: '#f2c14e', necklace: '#f2c14e', lips: '#d84a5a', boots: '#8a2f2a' } },
    { id: 'star', name: '小镇之星', price: 1500, stage: 8, desc: '白衫蓝裙 + 蓝丝带',
      c: { shirt: '#f8f4ea', pants: '#4a6a9a', tie: '#3a5a9a', satchel: true, satchelColor: '#6b4a3a', boots: '#3a3a40' } },
  ],
};
