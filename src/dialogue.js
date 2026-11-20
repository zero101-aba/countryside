// 对话引擎：话题 / 自由输入意图识别 / 按情绪与性格生成回答
import { ORDERS } from './config.js';
import { EMO_META, dominantEmotion } from './emotions.js';

export const CHAT_TOPICS = [
  { id: 'greet', label: '打个招呼', icon: '👋' },
  { id: 'care', label: '关心他', icon: '🫶' },
  { id: 'praise', label: '夸夸他', icon: '👏' },
  { id: 'work', label: '问问农活', icon: '🌾' },
  { id: 'village', label: '聊聊村里', icon: '🏡' },
  { id: 'food', label: '送点吃的', icon: '🍞' },
  { id: 'joke', label: '开个玩笑', icon: '😄' },
  { id: 'apologize', label: '道个歉', icon: '🙇' },
  { id: 'farewell', label: '先走了', icon: '👋' },
];
const TOPIC_MAP = Object.fromEntries(CHAT_TOPICS.map((t) => [t.id, t]));

// 玩家点击话题时说的话（让对话像真的在聊，而不是点按钮）
const PLAYER_LINES = {
  greet: ['在忙吗？', '我过来看看你。', '今天怎么样？'],
  care: ['今天累不累？', '别硬撑着，累了就歇会儿。', '身体要紧，别太拼。'],
  praise: ['你今天干得真不错。', '这活儿干得漂亮。', '有你在，我省心不少。'],
  work: ['地里的活进展怎么样？', '最近农活忙不忙？', '有什么要我帮忙的吗？'],
  village: ['村里最近有什么新鲜事？', '跟大家处得怎么样？', '最近村子还好吗？'],
  food: ['给你带了点吃的。', '饿不饿？我这儿有面包。', '先吃点东西垫垫。'],
  joke: ['我给你讲个笑话吧。', '别老板着脸嘛。', '猜猜我今天看见什么了？'],
  apologize: ['刚才是我说话急了，对不住。', '之前那事，是我考虑不周。'],
  farewell: ['那你忙吧，我先走了。', '回头见。'],
};

// 每个村民的语气：口头禅、称呼、签名句
const VOICES = {
  ahai: {
    pet: '', addr: '东家',
    firstMeet: ['东家。阿海，南边渔村的。要鱼，找我。'],
    openers: { joy: ['嗯。'], calm: ['嗯。'], anger: ['……'], sad: ['唉。'], anxious: ['东家，'], tired: ['呼……'] },
    sig: {
      greet: ['东家。今天水面平，适合下网。', '来了。我刚收完一笼。'],
      care: ['累倒不累，就是晒得慌。', '海边风大，习惯了。东家别操心。'],
      praise: ['……鱼是水养的，不是我养的。', '嗯，东家过奖。'],
      work: ['鱼群看潮水，急不来。', '码头那边水草多，鱼爱往那儿聚。'],
      food: ['面包？行，垫垫。', '谢了，正好没吃早饭。'],
      joke: ['……（咧嘴笑了一下）', '嗯，有点意思。'],
      village: ['渔村人少，清净。', '南边集市今天没什么人。'],
    },
  },
  xiaowei: {
    pet: '', addr: '东家',
    firstMeet: ['哟，东家？我叫小伟，刚回村里。以后多关照啊。'],
    openers: { joy: ['哟，'], calm: ['嗯，'], anger: ['……'], sad: ['唉，'], anxious: ['呃，'], tired: ['哎哟……'] },
    sig: {
      greet: ['哟，东家。今天天气不错啊，适合去河边坐坐。', '东家来啦，我正琢磨中午吃点啥。'],
      care: ['我好着呢，就是晒了点。东家你才辛苦，别老操心。', '不累不累，我这人别的本事没有，就是心宽。'],
      praise: ['嘿嘿，那必须的，我小伟出手还能差了？', '东家你眼光真好，我都不好意思了。'],
      work: ['地里的活我干得慢，你别嫌。我脑子快，手跟不上。', '这活我记下了，慢慢来呗，急也急不出花来。'],
      food: ['哎哟，面包！东家你太够意思了。', '那我就不客气了啊，正好垫垫。'],
      joke: ['哈哈哈，东家你这笑话有点东西。', '哎哟我天，笑死我了，你从哪听来的？'],
      village: ['村里最近挺热闹，集市又进了新货。', '听说集市进了新货，我正想去看看。'],
    },
  },
  xiaoyang: {
    pet: '', addr: '东家',
    firstMeet: ['东家好呀，我叫小杨。以后家里地里，有什么我能搭把手的，你尽管说。'],
    openers: { joy: ['嘻嘻，'], calm: ['嗯，'], anger: ['……'], sad: ['唉，'], anxious: ['东家，'], tired: ['唔……'] },
    sig: {
      greet: ['东家好呀。今天风不大，适合晒被子。', '呀，东家来了。我刚把院子扫干净。'],
      care: ['我没事的，东家。就是有点操心地里的水。', '谢谢东家惦记。你也别太累，事情是做不完的。'],
      praise: ['哪有……我就是把该做的做了。', '东家这么一说，我都不好意思了。谢谢你呀。'],
      work: ['苗都还好，就是有几垄该浇水了。', '活我慢慢做，做细一点，东家放心。'],
      food: ['呀，是给我的吗？那我收下了，谢谢东家。', '东家有心了。我正好有点饿。'],
      joke: ['嘻嘻，东家你真会逗人。', '……我没太听懂，不过看你笑，我也想笑。'],
      village: ['村里人都挺好的。就是有时候人多嘴杂，我插不上话。', '东家，你最近是不是没睡好？'],
    },
  },
  afu: {
    pet: '', addr: '东家',
    firstMeet: ['东家。头回说话吧？我叫阿福，种地的。有事你吩咐。'],
    openers: { joy: ['嗯。'], calm: ['嗯。'], anger: ['……'], sad: ['唉。'], anxious: ['东家。'], tired: ['呼……'] },
    sig: {
      greet: ['东家来了。日头正好，我正想下地。', '嗯，早。地里的土松得很。'],
      care: ['老骨头了，累不着。倒是东家你，别老熬夜。', '还行。活干顺了，人就不觉得乏。'],
      praise: ['（摆摆手）啥本事，就是干惯了。', '东家这么说，我明天多翻两垄。'],
      work: ['苗出得齐，再浇两遍水就稳了。', '地不哄人，你下多少功夫它记着。'],
      food: ['面包？那我就不客气了。', '哎，你咋知道我没吃早饭。'],
      joke: ['……（憋笑）行吧，有点意思。'],
      village: ['村里挺好。人多了，事也多。'],
    },
  },
  xiaoman: {
    pet: '', addr: '东家',
    firstMeet: ['诶——东家！可算跟我说上话了。我叫小满，跑腿送货的，村里的事我门儿清！'],
    openers: { joy: ['诶！'], calm: ['哎，'], anger: ['哼，'], sad: ['……'], anxious: ['哎呀，'], tired: ['哎哟……'] },
    sig: {
      greet: ['诶！东家来啦，我正想找人说话呢！', '哎呀，可算见着活人了，我跟你说啊——'],
      care: ['我？好得很！就是嘴有点干，话说多了。', '东家你才该歇歇，一天到晚净操心。'],
      praise: ['那可不！我这眼光，十里八乡挑不出第二个。', '嘿嘿，东家你可真会说话，再来两句？'],
      work: ['活啊……能干是能干，就是我这腰不争气。', '地里的活我帮不上大忙，不过消息我最灵。'],
      food: ['面包！我正饿得前胸贴后背呢。', '哎哟东家，你这一手，比工钱还暖心。'],
      joke: ['哈哈哈——哎哟我不行了，笑得我肚子疼。', '这笑话我得记下来，回头讲给铁柱听。'],
      village: ['村里啊，热闹！昨天集市又来了新货，我全打听清楚了。', '跟你说，春杏那丫头最近有心事，你多看着点。'],
    },
  },
  tiezhu: {
    pet: '', addr: '东家',
    firstMeet: ['东家。铁柱，砍树的。有重活喊我。'],
    openers: { joy: ['嘿。'], calm: ['嗯。'], anger: ['哼！'], sad: ['……嗐。'], anxious: ['啧。'], tired: ['呼哧……'] },
    sig: {
      greet: ['东家。有活直说。', '来了。我这手上都是木屑。'],
      care: ['累？笑话。就是肚子有点空。', '还行，扛得住。别把我当瓷做的。'],
      praise: ['那是。这活儿换个人还真干不了。', '嘿，东家你有眼光。'],
      work: ['树砍得动，地也翻得动，就是饭不够吃。', '给我加顿饭，我一天能干两天的活。'],
      food: ['好！这个实在！', '嗯——（三口吃完）还有吗？'],
      joke: ['……哈，有点意思。', '嘿，你这人，说话还挺逗。'],
      village: ['村里？没注意。我一般不进人堆。'],
    },
  },
  chunxing: {
    pet: '', addr: '东家',
    firstMeet: ['呀，东家好。我叫春杏，什么活都能搭把手……做得不好你别嫌我。'],
    openers: { joy: ['嘻嘻，'], calm: ['嗯……'], anger: ['……'], sad: ['唉，'], anxious: ['东家，'], tired: ['唔……'] },
    sig: {
      greet: ['东家好呀。今天的花开得可好看了。', '呀，东家来了，我正想跟人说话呢。'],
      care: ['我没事的……就是有时候会瞎想。', '东家你别担心我，我缓缓就好了。'],
      praise: ['真的吗？我、我其实也没做什么……', '谢谢你呀东家，听你这么说我心里松快多了。'],
      work: ['活我都干完了，就是总怕哪里没弄好。', '地里的事我还在学，做得慢，东家别嫌我。'],
      food: ['呀，是给我的吗？我正好有点饿。', '谢谢东家，我留着慢慢吃。'],
      joke: ['嘻嘻，东家你真坏。', '……我没听懂，不过看你笑我也想笑。'],
      village: ['村里人都挺好的，就是有时候我一个人待着会闷。', '大家最近都忙，我不好意思去打扰。'],
    },
  },
  laojing: {
    pet: '', addr: '东家',
    firstMeet: ['嗯。老井张。河边的。'],
    openers: { joy: ['嗯。'], calm: ['嗯。'], anger: ['……'], sad: ['……'], anxious: ['嗯？'], tired: ['唉。'] },
    sig: {
      greet: ['嗯。坐。', '来了。河面今天静。'],
      care: ['老毛病，不碍事。', '你去忙你的，我这儿有鱼陪着。'],
      praise: ['……不值当夸。', '嗯。手上还有活。'],
      work: ['地的事我不懂。水里的我熟。', '河里有鱼，就有底气。'],
      food: ['放这儿吧。我一会儿吃。', '嗯，谢了。'],
      joke: ['……（没笑）', '嗯，听懂了。'],
      village: ['村里的事，小满比我知道得多。'],
    },
  },
  ajin: {
    pet: '', addr: '东家',
    firstMeet: ['阿金。做手艺的。有事说。'],
    openers: { joy: ['嗯。'], calm: ['嗯。'], anger: ['……'], sad: ['嗯……'], anxious: ['东家，'], tired: ['呼。'] },
    sig: {
      greet: ['东家。手上有活，你说。', '嗯。正好歇一歇。'],
      care: ['不用管我，做完这点就歇。', '还成。活儿在手上，心里踏实。'],
      praise: ['嗯。应该的。', '……谢谢。不过还有一半没做完。'],
      work: ['活不难，就是费工夫。', '给我料，我就能做出来。'],
      food: ['嗯，谢了。', '正好，垫一口接着干。'],
      joke: ['……（嘴角动了一下）', '嗯。你心情不错。'],
      village: ['村里的事我插不上话。我管好手艺就行。'],
    },
  },
  generic: {
    pet: '', addr: '东家',
    openers: { joy: ['嗯！'], calm: ['嗯。'], anger: ['……'], sad: ['唉。'], anxious: ['东家，'], tired: ['呼……'] },
    sig: {},
  },
};

// 各情绪下「话题核心回答」的公共池
const TOPIC_POOLS = {
  greet: {
    joy: ['东家来得正好，我今天心情不错。', '来了！今天干啥都有劲。'],
    anger: ['……东家。有事说事。', '哼，来了。'],
    sadness: ['……嗯。东家。', '来了啊。'],
    anxiety: ['东家，你来得正好，我心里有点没底。', '啊，东家。'],
    fatigue: ['东家……我有点乏。', '嗯，来了。'],
    calm: ['东家。', '嗯，今天还行。', '来了。'],
  },
  care: {
    joy: ['托东家的福，吃得好睡得香。', '好着呢！东家别惦记我。'],
    anger: ['关心我？那你少派点活给我啊。', '……行吧，知道东家有心了。'],
    sadness: ['没事……就是心里有点空。', '缓缓就好了，东家别管我。'],
    anxiety: ['说实话，我总怕赶不上节气。', '有点慌，但不敢说。'],
    fatigue: ['累是真累。不过歇一觉就好。', '腰快不行了，可这活儿不等人。'],
    calm: ['还行，能撑住。', '吃得好，睡得着，就行了。'],
  },
  praise: {
    joy: ['嘿嘿，东家这么夸，我更有劲了。', '哪有那么好，不过听着舒坦。'],
    anger: ['……少来。夸两句就想让我多干活？', '哼，嘴上说得好听。'],
    sadness: ['真的吗……谢谢你，东家。', '唉，我哪有你说的那么好。'],
    anxiety: ['谢东家……可我总觉得还差得远。', '你别夸我，一夸我压力更大。'],
    fatigue: ['谢谢东家……就是有点没力气高兴。', '唉，夸我也解不了乏。'],
    calm: ['东家过奖了。', '嗯，应该的。'],
  },
  work: {
    joy: ['地里的苗齐整，看着就舒心。', '今天顺，一锄下去就是好土。'],
    anger: ['活多得干不完，还没人搭把手。', '再多派活，我可要撂挑子了。'],
    sadness: ['干是干了，就是觉得没个头。', '地不会说话，可它知道我有多累。'],
    anxiety: ['就怕水跟不上，苗一蔫就白忙。', '东家，肥该备了，再晚赶不上。'],
    fatigue: ['活还行，就是腰不答应。', '干得动，就是慢。'],
    calm: ['按部就班，该干啥干啥。', '今天活不多，能收个早。'],
  },
  village: {
    joy: ['村里最近热闹，集市上又进了新种子。', '大家都在忙，日子有奔头。'],
    anger: ['别提了，有人干活偷懒，我看不过去。', '村里有些人，光会说不会做。'],
    sadness: ['……村里人各忙各的，有时觉得挺冷清。', '我总觉得跟大家隔着一层。'],
    anxiety: ['听说西边那块地不太好，不知道是不是真的。', '村里事多，我怕说错话得罪人。'],
    fatigue: ['我现在没心思说这些，让我歇会儿。', '村里的事改天再聊吧。'],
    calm: ['就那样，老样子。', '大家都还行。'],
  },
  food: {
    joy: ['哎，面包！东家你太懂我了。', '谢了，我正饿着呢。'],
    anger: ['……放那儿吧。', '吃的？哼，算你有心。'],
    sadness: ['谢谢东家……我正好没胃口。', '有口吃的，心里暖一点。'],
    anxiety: ['谢东家，我吃两口就接着干。', '你留着吧，我不太饿。'],
    fatigue: ['谢谢……我正需要这个。', '这口热乎的最舒服。'],
    calm: ['嗯，谢谢东家。', '那我就不客气了。'],
  },
  joke: {
    joy: ['哈哈哈，东家你这嘴！', '哎哟，笑死我了。'],
    anger: ['……这时候开玩笑，合适吗。', '别逗了，我没心情。'],
    sadness: ['……我笑不出来，东家。', '嗯，你开心就好。'],
    anxiety: ['别逗了，我心里正乱。', '……我现在笑不出来。'],
    fatigue: ['哈哈哈……哈，没力气笑了。', '有、有点好笑，但我困。'],
    calm: ['嗯……有点冷。', '哈哈，还行。'],
  },
  apologize: {
    joy: ['东家言重了，我早忘了。', '没事没事，都是一家人。'],
    anger: ['知道就好。我也不是记仇的人。', '算了，下回别这样。'],
    sadness: ['……嗯。那事我确实难过了一下。', '没事，东家也有难处。'],
    anxiety: ['啊，没有没有，是我不好。', '东家你别这么说，我压力大。'],
    fatigue: ['没事。都过去了。', '嗯，翻篇吧。'],
    calm: ['东家言重了。', '没事，都过去了。'],
  },
  chat: {
    joy: ['嗯，我听着呢，东家继续说。', '跟你说话，心里敞亮。'],
    anger: ['有什么就直说吧。', '说。'],
    sadness: ['嗯……你说。', '我听着。'],
    anxiety: ['东家，你是不是有什么事？', '你说，我听着呢。'],
    fatigue: ['嗯……我在听。', '你慢慢说。'],
    calm: ['嗯，我在听。', '东家想说什么？'],
  },
  farewell: {
    joy: ['去吧东家，回头见。', '好嘞，你忙你的。'],
    anger: ['嗯。', '……走吧。'],
    sadness: ['嗯，慢走。', '……好。'],
    anxiety: ['东家慢走。', '嗯，路上小心。'],
    fatigue: ['嗯……我先歇着了。', '好，回头见。'],
    calm: ['回头见。', '嗯，去吧。'],
  },
};

// 情绪化开场白（可选，30%）
const DOM_PREFIX = {
  joy: ['哎，', '嗯！', '嘿嘿，'],
  anger: ['……', '哼，', '（没好气）'],
  sadness: ['唉……', '……', '低着头的他顿了顿：'],
  anxiety: ['东家……', '（搓了搓手）', '唉呀，'],
  fatigue: ['呼……', '（揉了揉腰）', '……'],
  calm: ['', '', ''],
};

// 上下文补充（25%）
function contextLine(v, ctx, dom) {
  const s = v.sim;
  const opts = [];
  if (ctx.ready > 0) opts.push(`地里有 ${ctx.ready} 块熟透了，你看见没？`);
  if (ctx.hunger > 72) opts.push('说真的，我肚子有点空。');
  if (ctx.energy < 24) opts.push('我这两条腿有点沉。');
  if (ctx.hour < 8) opts.push('一大早的，露水还没干。');
  if (ctx.hour >= 19) opts.push('天快黑了，我得收工了。');
  if (s.season === 0) opts.push('开春了，该换茬了。');
  else if (s.season === 3) opts.push('冬天土硬，什么都难长。');
  if (ctx.money < 20) opts.push('东家，账上是不是有点紧？');
  if (ctx.taskVerb) opts.push(`我正${ctx.taskVerb}呢，等会儿再细说。`);
  if (dom.key === 'anger') opts.push('你今天最好别给我添活。');
  // 别连续两次说同一句
  const fresh = opts.filter((x) => x !== v.memory.lastCtx);
  const pool = fresh.length ? fresh : opts;
  if (!pool.length) return null;
  const line = pool[Math.floor(Math.random() * pool.length)];
  v.memory.lastCtx = line;
  return line;
}

// 闲聊池（自由输入没匹配到具体意图时）
const SMALLTALK = [
  '嗯……东家想说什么？',
  '我听着呢。',
  '这会儿日头正好，说说话也不赖。',
  '东家今天话挺多啊。',
  '……你说，我听着。',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function talkContext(v) {
  const s = v.sim;
  const task = v.task;
  return {
    hour: s.hour,
    clock: s.clockText,
    day: s.day,
    season: s.season,
    seasonName: s.seasonName,
    money: s.money,
    harvest: s.stats.harvested,
    villagers: s.villagers.length,
    crops: s.world.plots.filter((p) => p.crop).length,
    ready: s.world.plots.filter((p) => s.cropReady(p)).length,
    task: task?.type || null,
    taskVerb: task ? ORDERS[task.type].verb : null,
    hunger: v.needs.hunger,
    energy: v.needs.energy,
    social: v.needs.social,
    lastOrder: v.lastOrderType,
    domKey: v.emotionKey,
    season3: s.season === 3,
  };
}

// 意图识别：关键词 → 话题
export function matchIntent(raw) {
  const t = (raw || '').trim();
  if (!t) return null;
  const has = (arr) => arr.some((k) => t.includes(k));
  if (has(['对不起', '抱歉', '原谅', '道歉', '对不住'])) return 'apologize';
  if (has(['再见', '拜拜', '先走了', '回头见', '忙你的', '先忙'])) return 'farewell';
  if (has(['你是谁', '叫什么', '名字', '多大', '哪里人', '哪来的'])) return 'name';
  if (has(['喜欢你', '爱你', '亲一个', '抱抱', '结婚', '约会'])) return 'love';
  if (has(['吃', '饿', '面包', '饭', '给你带', '送你', '吃点'])) return 'food';
  if (has(['玩笑', '笑话', '哈哈', '逗', '开心点', '猜猜', '搞笑'])) return 'joke';
  if (has(['厉害', '棒', '了不起', '夸', '佩服', '干得好', '真行', '能干', '谢谢你', '不错', '漂亮'])) return 'praise';
  if (has(['累', '辛苦', '休息', '身体', '还好吗', '担心', '歇', '别太拼', '保重', '睡得好'])) return 'care';
  if (has(['你好', '您好', '嗨', '早', '在吗', '哈喽', 'hello', 'hi', '来了'])) return 'greet';
  if (has(['农活', '地里', '庄稼', '收成', '种', '耕', '浇', '砍', '钓鱼', '干活', '田地', '苗', '作物'])) return 'work';
  if (has(['村子', '小镇', '大家', '别人', '村里', '天气', '季节', '镇上', '邻居', '新鲜事', '最近'])) return 'village';
  return null;
}

// 判断是否在刷同一个话题
function isSpam(v, topicId) {
  const now = Date.now();
  const recent = (v.memory?.recentTopics || []).filter((r) => now - r.at < 15000);
  const same = recent.filter((r) => r.id === topicId).length;
  return same >= 2;
}

function markTopic(v, topicId) {
  if (!v.memory) v.memory = { recentTopics: [], conversation: [] };
  const now = Date.now();
  v.memory.recentTopics = (v.memory.recentTopics || []).filter((r) => now - r.at < 20000);
  v.memory.recentTopics.push({ id: topicId, at: now });
}

// 村民之间互聊：根据双方情绪挑一组对白
const VILLAGE_CHAT = [
  ['今年的苗出得齐。', '是啊，就看后面雨水了。'],
  ['你这活干得真快。', '干惯了，手上快。'],
  ['中午吃什么？', '面包呗，还能吃啥。'],
  ['听说集市又进新种子了。', '回头去看看，正好缺点。'],
  ['这天色，怕是要变。', '变就变吧，地里的活不等天。'],
  ['你腰还疼不疼？', '老毛病了，不碍事。'],
  ['东家最近常来。', '来了好，有人管着，村子才有样子。'],
  ['晚上早点睡。', '嗯，你也是。'],
  ['这批木头够结实。', '够用一阵子了。'],
  ['河边鱼多吗？', '今天还行，钓了两条。'],
];

const CHAT_MOOD_OPEN = {
  joy: ['哎，', '嘿，'],
  anger: ['……', '（闷声）'],
  sadness: ['唉，', '……'],
  anxiety: ['哎，', '东家说……'],
  fatigue: ['呼，', '……'],
  calm: ['', ''],
};

export function villageChatLines(a, b) {
  const pair = pick(VILLAGE_CHAT);
  const da = dominantEmotion(a.emo);
  const db = dominantEmotion(b.emo);
  let la = pair[0], lb = pair[1];
  if (da.key === 'anger') la = pick(['你这活干得也太慢了。', '这日子，真是没个头。']) ;
  if (da.key === 'sadness') la = pick(['你最近……还好吗。', '有时候真不想干了。']);
  if (db.key === 'joy') lb = pick(['可不是嘛，往好处想。', '哈哈，说得对。']);
  if (db.key === 'anger') lb = pick(['哼，你也这么说。', '别提了，烦着呢。']);
  if (db.key === 'sadness') lb = pick(['嗯……', '唉，都一样。']);
  return [la, lb];
}

// 开场白
export function buildGreeting(v) {
  const dom = dominantEmotion(v.emo);
  const voice = VOICES[v.id] || VOICES.generic;
  if (v.state === 'sleeping') return '（他睡着了，没有应声。）';
  if (!v.memory.talkCount) {
    if (voice.firstMeet) return voice.firstMeet[0];
    return `${voice.addr}？我是${v.name}，${v.role}。有事你吩咐。`;
  }
  const sig = voice.sig.greet || [];
  const pool = TOPIC_POOLS.greet[dom.key] || TOPIC_POOLS.greet.calm;
  return pick([...pool, ...sig]);
}

// 主入口：生成一次对话回应
export function buildTalk(v, topicId, playerText = '') {
  const ctx = talkContext(v);
  const dom = dominantEmotion(v.emo);
  const voice = VOICES[v.id] || VOICES.generic;
  const KNOWN = TOPIC_MAP[topicId] || topicId === 'name' || topicId === 'love' || topicId === 'chat';
  const topic = KNOWN ? topicId : 'chat';

  // 睡着了就被吵不醒
  if (v.state === 'sleeping') {
    const said0 = playerText && playerText.trim() ? playerText.trim() : pick(PLAYER_LINES[topic] || PLAYER_LINES.greet);
    return finish(v, said0, '……（他翻了个身，嘟囔了一句什么，没醒。）', 'smalltalk', 1, { asleep: true });
  }
  const spam = isSpam(v, topic);
  markTopic(v, topic);

  // 玩家说的话
  let said = playerText && playerText.trim();
  if (!said) said = pick(PLAYER_LINES[topic] || PLAYER_LINES.greet);

  let feel = 'smalltalk';
  let mult = 1;
  const effects = {};

  // 刷屏惩罚
  if (spam) {
    feel = 'spam';
    const annoyed = [
      '……同样的话说三遍了，东家。',
      '你今天是闲得慌？',
      '（他别过头去）……',
    ];
    return finish(v, said, pick(annoyed), feel, 1, effects);
  }

  // 食物：真的会消耗面包并填肚子
  if (topic === 'food') {
    if ((v.sim.inventory.bread || 0) > 0) {
      v.sim.inventory.bread -= 1;
      v.sim.uiDirty = true;
      effects.bread = true;
      v.needs.hunger = Math.max(0, v.needs.hunger - 45);
      feel = 'gift';
    } else {
      feel = 'smalltalk';
      effects.noBread = true;
    }
  }

  if (topic === 'care') feel = 'care';
  if (topic === 'praise') feel = 'praise';
  if (topic === 'apologize') feel = 'apologize';
  if (topic === 'joke') {
    feel = (dom.key === 'anger' || dom.key === 'sadness' || dom.key === 'anxiety') ? 'joke_bad' : 'joke_ok';
  }
  if (topic === 'greet' || topic === 'farewell') feel = 'greet';

  // 核心回答
  let core;
  if (topic === 'food' && effects.noBread) {
    core = pick(['东家有心了，可家里没面包了。', '吃的？我这儿就剩口水了。', '等集市进新货再说吧。']);
  } else if (topic === 'name') {
    core = pick([`我叫${v.name}，${v.role}。`, `${v.name}。${v.role}，来村里有些年头了。`]);
  } else if (topic === 'love') {
    core = pick(['东家……这话我可不敢接。', '（脸红）干活去吧东家。', '……你别拿我寻开心。']);
    feel = 'joke_bad';
  } else {
    const pool = TOPIC_POOLS[topic]?.[dom.key] || TOPIC_POOLS.chat[dom.key] || SMALLTALK;
    const sig = voice.sig[topic];
    core = sig && Math.random() < 0.72 ? pick(sig) : pick(pool);
  }

  // 组装：开场 + 核心 + 上下文
  let reply = core;
  if (Math.random() < 0.3) {
    const p = pick(DOM_PREFIX[dom.key] || ['']);
    if (p && !reply.startsWith(p)) reply = p + reply;
  }
  if (Math.random() < 0.28) {
    const c = contextLine(v, ctx, dom);
    if (c && !reply.includes(c)) reply += '\n' + c;
  }

  return finish(v, said, reply, feel, mult, effects);
}

function finish(v, said, reply, feel, mult, effects) {
  const dom = dominantEmotion(v.emo);
  v.memory.talkCount = (v.memory.talkCount || 0) + 1;
  v.memory.conversation = v.memory.conversation || [];
  v.memory.conversation.push({ who: 'me', text: said, at: Date.now() });
  v.memory.conversation.push({ who: 'v', text: reply, emoji: dom.emoji, at: Date.now() });
  if (v.memory.conversation.length > 24) v.memory.conversation.splice(0, v.memory.conversation.length - 24);
  v.needs.social = Math.min(100, v.needs.social + 10);
  return { said, reply, feel, mult, effects, topic: feel, emoji: dom.emoji, dom };
}





