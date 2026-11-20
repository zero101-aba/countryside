class_name GameData
extends RefCounted
# 田园小镇 · 共享数据（Godot 版）

const TILE := 24
const MAP_W := 80
const MAP_H := 56
const HOUR_SECONDS := 5.0
const DAYS_PER_SEASON := 28

const SEASONS := ["春", "夏", "秋", "冬"]

# 5 种作物：季节、生长小时、价格、四阶段造型色
const CROPS := {
	"radish": {"name": "萝卜", "seed": 6, "sell": 16, "grow": 8.0, "seasons": [0, 2], "color": Color("#f2f0ea"), "leaf": Color("#5f9a48")},
	"turnip": {"name": "芜菁", "seed": 10, "sell": 28, "grow": 14.0, "seasons": [0, 1, 2], "color": Color("#c9a0d8"), "leaf": Color("#5f9a48")},
	"carrot": {"name": "胡萝卜", "seed": 16, "sell": 46, "grow": 20.0, "seasons": [0, 1, 2], "color": Color("#e8823c"), "leaf": Color("#79b45a")},
	"strawberry": {"name": "草莓", "seed": 30, "sell": 92, "grow": 30.0, "seasons": [0, 1], "color": Color("#d84a5a"), "leaf": Color("#4f8f48")},
	"pumpkin": {"name": "南瓜", "seed": 55, "sell": 170, "grow": 46.0, "seasons": [1, 2], "color": Color("#e08a3c"), "leaf": Color("#4f8f48")},
}

const ITEM_PRICE := {"wood": 14, "fish": 34, "stone": 24, "ore": 55, "egg": 14, "milk": 38, "wool": 52}
const ITEM_NAME := {"wood": "木头", "fish": "鱼", "stone": "石头", "ore": "矿石", "egg": "鸡蛋", "milk": "牛奶", "wool": "羊毛", "bread": "面包"}

const ANIMALS := [
	{"kind": "chicken", "n": 3, "x": 44.0, "y": 9.0, "product": "egg", "every": 10.0},
	{"kind": "chick", "n": 1, "x": 45.0, "y": 10.0, "product": "", "every": 0.0},
	{"kind": "cow", "n": 2, "x": 40.0, "y": 24.0, "product": "milk", "every": 12.0},
	{"kind": "calf", "n": 1, "x": 42.0, "y": 25.0, "product": "", "every": 0.0},
	{"kind": "sheep", "n": 2, "x": 38.0, "y": 26.0, "product": "wool", "every": 16.0},
	{"kind": "lamb", "n": 1, "x": 41.0, "y": 27.0, "product": "", "every": 0.0},
	{"kind": "duck", "n": 2, "x": 34.0, "y": 32.0, "product": "egg", "every": 11.0},
	{"kind": "duckling", "n": 1, "x": 35.0, "y": 33.0, "product": "", "every": 0.0},
	{"kind": "goose", "n": 1, "x": 33.0, "y": 34.0, "product": "egg", "every": 13.0},
	{"kind": "cat", "n": 1, "x": 18.0, "y": 8.0, "product": "", "every": 0.0},
	{"kind": "dog", "n": 1, "x": 20.0, "y": 9.0, "product": "", "every": 0.0},
]

const OUTFITS := {
	"xiaowei": [
		{"id": "default", "name": "回乡青年", "price": 0, "stage": 0, "desc": "黑卫衣 + 牛仔裤", "c": {}},
		{"id": "farm", "name": "田间工装", "price": 120, "stage": 2, "desc": "草帽 + 绿衫 + 围裙", "c": {"shirt": "#5f8f4a", "pants": "#3f6b3a", "hat": "straw", "apron": true}},
		{"id": "fisher", "name": "河畔渔夫", "price": 260, "stage": 3, "desc": "鸭舌帽 + 灰马甲 + 挎包", "c": {"shirt": "#4e6d8a", "pants": "#3f4a56", "hat": "cap", "vest": true, "satchel": true}},
		{"id": "miner", "name": "后山矿工", "price": 420, "stage": 4, "desc": "黄安全帽 + 棕夹克", "c": {"shirt": "#8a6a4a", "pants": "#3a3a40", "hat": "helmet"}},
		{"id": "festival", "name": "节日礼服", "price": 800, "stage": 6, "desc": "红马甲 + 金饰带", "c": {"shirt": "#f4efe6", "pants": "#3a3a46", "vest": true, "tie": "#c8a020"}},
		{"id": "star", "name": "小镇之星", "price": 1500, "stage": 8, "desc": "金印黑卫衣 + 耳钉", "c": {"shirt": "#2a2a30", "pants": "#93aecb", "hood": true, "logo": true}},
	],
	"xiaoyang": [
		{"id": "default", "name": "白衫姑娘", "price": 0, "stage": 0, "desc": "丸子头 + 白 T 恤", "c": {}},
		{"id": "farm", "name": "田间姑娘", "price": 120, "stage": 2, "desc": "草帽 + 粉裙 + 围裙", "c": {"shirt": "#d98aa8", "pants": "#a86a72", "hat": "straw", "apron": true}},
		{"id": "fisher", "name": "河畔渔娘", "price": 260, "stage": 3, "desc": "红头巾 + 青衫 + 网袋", "c": {"shirt": "#4e9a8a", "pants": "#4a4038", "scarf": true, "satchel": true}},
		{"id": "florist", "name": "花房姑娘", "price": 420, "stage": 4, "desc": "紫裙 + 花饰", "c": {"shirt": "#b8a0e0", "pants": "#8a7ab8", "hairpin": true}},
		{"id": "festival", "name": "节日红妆", "price": 800, "stage": 6, "desc": "红裙 + 金发簪", "c": {"shirt": "#a83232", "pants": "#7a2a2a", "hairpin": true, "necklace": true}},
		{"id": "star", "name": "小镇之星", "price": 1500, "stage": 8, "desc": "白衫蓝裙 + 蓝丝带", "c": {"shirt": "#f8f4ea", "pants": "#4a6a9a", "tie": "#3a5a9a", "satchel": true}},
	],
}

const STAGES := [
	{"name": "落脚", "cond": "收获 1 次", "unlock": "每日委托板", "feature": "quests"},
	{"name": "牧歌", "cond": "播种 3 次", "unlock": "收牧产、夜晚自动跳过", "feature": "collect"},
	{"name": "开市", "cond": "累计收入 150G", "unlock": "8× 速度", "feature": "speed8"},
	{"name": "进山", "cond": "累计收获 10 次", "unlock": "后山林地与挖矿", "feature": "mine"},
	{"name": "渔获", "cond": "累计钓 5 条鱼", "unlock": "鲜鱼售价 +20%", "feature": "fish_bonus"},
	{"name": "矿工", "cond": "累计挖矿 10 次", "unlock": "矿石售价 +30%", "feature": "ore_bonus"},
	{"name": "交心", "cond": "小伟与小杨关系 60", "unlock": "AI 自动对话（预留）", "feature": "ai_auto"},
	{"name": "走遍小镇", "cond": "解锁全部区域", "unlock": "小镇荣誉称号", "feature": "title"},
]

const ACHIEVEMENTS := [
	{"id": "harvest10", "name": "初次丰收", "desc": "累计收获 10 次", "reward": 40},
	{"id": "wood30", "name": "伐木工", "desc": "累计砍 30 根木头", "reward": 60},
	{"id": "fish20", "name": "钓叟", "desc": "累计钓 20 条鱼", "reward": 100},
	{"id": "mine20", "name": "矿工", "desc": "累计挖矿 20 次", "reward": 100},
	{"id": "animal20", "name": "牧场主", "desc": "累计收牧产 20 次", "reward": 100},
	{"id": "quest10", "name": "可靠的东家", "desc": "完成 10 份委托", "reward": 120},
	{"id": "money1000", "name": "小有积蓄", "desc": "持有 1000 金币", "reward": 0},
	{"id": "regions4", "name": "走遍小镇", "desc": "解锁全部 4 个区域", "reward": 150},
	{"id": "bond70", "name": "两情相悦", "desc": "小伟与小杨关系达到 70", "reward": 0},
]

# 区域：cols/rows 闭区间
const REGIONS := [
	{"id": "orchard", "name": "西岭果园", "x0": 0, "y0": 0, "x1": 44, "y1": 17, "unlock": "播种 3 次", "stage": 2},
	{"id": "village", "name": "青禾村", "x0": 0, "y0": 18, "x1": 44, "y1": 55, "unlock": "开局", "stage": -1},
	{"id": "forest", "name": "后山林地", "x0": 49, "y0": 0, "x1": 79, "y1": 31, "unlock": "累计收获 10 次", "stage": 4},
	{"id": "lake", "name": "湖畔渔村", "x0": 49, "y0": 32, "x1": 79, "y1": 55, "unlock": "第 2 天", "stage": -1},
]

const TIPS := [
	"点一个村民，他会选中并跟随；点底部输入框直接说人话。",
	"地图更大了：西边果园、南边村庄、东边林地与湖畔渔村。",
	"作物只在湿润时生长，雨天地会自己湿。",
	"没活的时候，村民会按自己的性格去做想做的事。",
	"小杨会自己去集市买种子，小伟会自己去卖库存。",
	"入夜后顶栏出现月亮按钮，可以跳过夜晚。",
	"每到新阶段会解锁新玩法，服装店也会上新。",
]
