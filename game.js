/* =====================================================================
   三国立志传 · 网页版  Phase 1: 核心架构与基础框架
   - 渲染循环 (requestAnimationFrame)
   - 回合制时间系统 (1 行动 = 1 天, 四季更替)
   - 节点式大地图 (Canvas 渲染 + 点击移动)
   - 角色五维属性 + LocalStorage 存档
   - 随机事件 / 历史事件 (黄巾之乱等) 时间线
   ===================================================================== */
"use strict";

/* ============================================================
   一、静态数据 (Phase 4 会拆分为独立 JSON)
   ============================================================ */

// 大地图节点：type = 城/港/村/山林/道场
const NODES = [
  { id:"luoyang",  name:"洛阳", type:"城",   x:400, y:300, desc:"帝都所在，天下枢纽。" },
  { id:"changan",  name:"长安", type:"城",   x:270, y:320, desc:"西汉故都，商贾云集。" },
  { id:"xuchang",  name:"许昌", type:"城",   x:475, y:375, desc:"中原腹地，沃野千里。" },
  { id:"wan",      name:"宛城", type:"村",   x:415, y:450, desc:"南来北往的驿站村镇。" },
  { id:"xiangyang",name:"襄阳", type:"城",   x:395, y:565, desc:"荆襄重镇，水陆要冲。" },
  { id:"jiangling",name:"江陵", type:"港",   x:475, y:605, desc:"长江渡口，舟船如梭。" },
  { id:"changsha", name:"长沙", type:"城",   x:520, y:665, desc:"湘水之滨，鱼米之乡。" },
  { id:"chengdu",  name:"成都", type:"城",   x:175, y:560, desc:"天府之国，锦绣繁华。" },
  { id:"hanzhong", name:"汉中", type:"山林", x:245, y:465, desc:"崇山峻岭间的险要关隘。" },
  { id:"jianye",   name:"建业", type:"港",   x:645, y:540, desc:"江东都会，毗邻大江。" },
  { id:"wu",       name:"吴郡", type:"港",   x:710, y:620, desc:"鱼盐之利，海船往来。" },
  { id:"shouchun", name:"寿春", type:"城",   x:575, y:430, desc:"淮南重镇，漕运中枢。" },
  { id:"xiapi",    name:"下邳", type:"城",   x:625, y:320, desc:"徐州要地，兵家必争。" },
  { id:"beihai",   name:"北海", type:"城",   x:660, y:235, desc:"孔融治下，礼乐之邦。" },
  { id:"pinyuan",  name:"平原", type:"村",   x:540, y:195, desc:"黄河岸边的小村庄。" },
  { id:"ye",       name:"邺城", type:"城",   x:480, y:170, desc:"河北富庶之地。" },
  { id:"jinyang",  name:"晋阳", type:"山林", x:400, y:135, desc:"并州山地，胡汉杂居。" },
  { id:"beiping",  name:"北平", type:"城",   x:630, y:115, desc:"边塞雄关，直面乌桓。" },
];

// 相邻关系（双向）
const EDGES = [
  ["luoyang","changan"],["luoyang","xuchang"],["luoyang","ye"],["luoyang","wan"],
  ["changan","hanzhong"],
  ["xuchang","wan"],["xuchang","shouchun"],["xuchang","xiapi"],
  ["wan","xiangyang"],
  ["xiangyang","jiangling"],["xiangyang","hanzhong"],
  ["jiangling","changsha"],["jiangling","jianye"],
  ["chengdu","hanzhong"],
  ["jianye","shouchun"],["jianye","wu"],
  ["shouchun","xiapi"],
  ["xiapi","beihai"],
  ["beihai","pinyuan"],["pinyuan","ye"],["pinyuan","beiping"],
  ["ye","jinyang"],["jinyang","beiping"],
];

// 历史事件时间线（年, 月, 日, 标题, 描述, 效果）
const HISTORICAL_EVENTS = [
  { y:184, m:2,  d:1, title:"黄巾之乱", text:"「苍天已死，黄天当立！」张角率太平道徒揭竿而起，天下大乱。乱世，开始了。", fame:+10 },
  { y:189, m:8,  d:15,title:"董卓进京", text:"何进被杀，董卓趁乱入洛阳，废立皇帝，火烧宫室。洛阳城内人人自危。", fame:+5 },
  { y:190, m:1,  d:1, title:"关东讨董", text:"袁绍召集关东十八路诸侯共讨董卓。天下群雄并起，逐鹿中原。", fame:+8 },
  { y:192, m:5,  d:1, title:"青州兵成军", text:"曹操收编青州黄巾百万，实力大增，自此有了争雄天下的本钱。", fame:+3 },
  { y:200, m:4,  d:1, title:"官渡大战", text:"曹操与袁绍决战官渡，火烧乌巢，以弱胜强。北方霸权尘埃初定。", fame:+5 },
  { y:207, m:12, d:1, title:"三顾茅庐", text:"刘备三顾茅庐请出诸葛亮。隆中一对，天下三分之势渐显。", fame:+5 },
  { y:208, m:11, d:1, title:"赤壁之战", text:"曹操八十三万大军压境，周瑜黄盖火烧赤壁，大江之上烈焰冲天！三国鼎立的格局自此奠定。", fame:+10 },
  { y:219, m:7,  d:1, title:"水淹七军", text:"关羽北伐襄樊，水淹于禁七军，威震华夏。", fame:+5 },
];

// 路上随机事件（移动途中每日触发概率判定）
const RANDOM_ROAD_EVENTS = [
  { id:"bandit", w:3,
    title:"山贼拦路", text:"行至一处林间小道，忽听得一声唿哨，数十名山贼从林中窜出：「留下买路财！」",
    options:[
      { label:`拔剑而战（武力判定）`, effect:"fight_bandit" },
      { label:"破财免灾（损失 20% 金钱）", effect:"lose_money" },
    ]},
  { id:"merchant", w:2,
    title:"路遇商队", text:"一支商队与你同行，领队是个和气的胖商人，邀你喝酒歇脚。",
    options:[ { label:"把酒言欢", effect:"meet_merchant" } ]},
  { id:"sage", w:1,
    title:"隐士论道", text:"山间茅庐前，一位鹤发老者邀你对弈一局，谈古论今。",
    options:[ { label:"欣然对弈", effect:"meet_sage" } ]},
  { id:"storm", w:2,
    title:"风雨交加", text:"半路天降暴雨，道路泥泞难行，你只好冒雨赶路。",
    options:[ { label:"冒雨前行（体力-15）", effect:"storm" } ]},
  { id:"ruins", w:1,
    title:"废弃村落", text:"路过一座被战火焚毁的村落，断壁残垣间隐约可见幸存者的身影。",
    options:[
      { label:"施舍银两（-50 贯，名声+3）", effect:"help_villagers" },
      { label:"匆匆离去", effect:"none" },
    ]},
];

// 每日可在城内执行的行动定义
const ACTIONS = {
  rest:   { name:"客栈休息", hp:0, cost:0 },
  train:  { name:"勤练武艺", hp:20 },
  study:  { name:"书院读书", hp:20 },
  social: { name:"拜访名士", hp:15 },
  work:   { name:"市集帮工", hp:25 },
  search: { name:"四处探索", hp:20 },
};

const IDENTITIES = {
  "侠客": { title:"游侠", desc:"以武犯禁，游走乱世，可仕官晋升、攻城略地。" },
  "商人": { title:"行商", desc:"低买高卖，富可敌国，亦可垄断物价。" },
  "间谍": { title:"暗探", desc:"潜入敌营，暗杀谍报，翻云覆雨。" },
  "海贼": { title:"水寇", desc:"劫掠商船，纵横江河，亦可为水军都督。" },
  "医生": { title:"医者", desc:"悬壶济世，采药配药，救人积德。" },
  "帮主": { title:"掌门", desc:"开宗立派，广收门徒，比武扬名。" },
};

// 存档键名
const SAVE_KEY = "sanguo_save_v1";

/* ============================================================
   Phase 2 新增数据：货物 / 城市特产 / 势力 / 官职
   ============================================================ */

// 货物：base 基准价，peakMonths 应季月（卖出与买入皆上涨），troughMonths 淡季
const GOODS = [
  { id:"tan",   name:"木炭", base:30,  peak:[11,12,1], trough:[5,6,7],  desc:"冬日取暖必需" },
  { id:"shan",  name:"扇子", base:25,  peak:[5,6,7],   trough:[11,12,1], desc:"夏日纳凉利器" },
  { id:"yan",   name:"盐",   base:60,  peak:[],        trough:[],        desc:"官营硬通货" },
  { id:"cha",   name:"茶叶", base:45,  peak:[3,4,5],   trough:[9,10],   desc:"名士雅好" },
  { id:"chou",  name:"丝绸", base:90,  peak:[],        trough:[],        desc:"锦绣华服之材" },
  { id:"tie",   name:"铁器", base:75,  peak:[],        trough:[],        desc:"兵器农具之源" },
  { id:"liang", name:"粮草", base:20,  peak:[2,3,4],   trough:[8,9],    desc:"青黄不接时价高" },
  { id:"yao",   name:"药材", base:55,  peak:[],        trough:[],        desc:"医者必需（Phase 3 采药）" },
  { id:"ci",    name:"瓷器", base:110, peak:[],        trough:[],        desc:"易碎，利润丰厚" },
  { id:"ma",    name:"马匹", base:200, peak:[],        trough:[],        desc:"战乱年代硬通货" },
];
const goodById = id => GOODS.find(g => g.id === id);

// 城市特产折扣（<1 便宜，适合买入；>1 高价，适合卖出）
const CITY_SPECIALTY = {
  luoyang:   { default:1.10, tie:1.05, ma:1.05 },           // 中原枢纽，物价偏高
  xuchang:   { default:1.08, liang:1.0, cha:0.95 },
  changan:   { default:1.0,  chou:0.80, ma:0.85 },           // 丝绸之路起点
  chengdu:   { default:1.0,  cha:0.70, chou:0.85, yao:0.75, ci:0.9 },  // 天府之国
  hanzhong:  { default:0.95, yao:0.85, liang:1.05 },
  jianye:    { default:1.05, ci:0.75, yan:0.85 },           // 江东都会
  wu:        { default:1.0,  yan:0.80, ci:0.80, chou:0.9 },  // 鱼盐之利
  beiping:   { default:1.0,  ma:0.70, tie:0.85 },           // 边塞产马
  jinyang:   { default:0.95, ma:0.75, tie:0.80 },
  changsha:  { default:0.9,  liang:0.75 },                 // 鱼米之乡
  jiangling: { default:0.95, liang:0.8, cha:0.9 },
  xiangyang: { default:1.0,  liang:0.85, tie:0.95 },
  beihai:    { default:0.95, yan:0.9, chou:1.0 },
  xiapi:     { default:1.0,  chou:0.9, tie:0.9 },
  shouchun:  { default:1.05, liang:0.85 },
  ye:        { default:1.0,  chou:0.95, ma:0.9 },
  pinyuan:   { default:0.85, liang:0.7 },                  // 村庄，物价低
  wan:       { default:0.9,  liang:0.8, yao:0.95 },
};

// 势力（184 年开局格局）
const FORCES = [
  { id:"dongzhuo", name:"董卓", leader:"董卓", capital:"changan" },
  { id:"caocao",   name:"曹操", leader:"曹操", capital:"xuchang" },
  { id:"yuanshao", name:"袁绍", leader:"袁绍", capital:"ye" },
  { id:"liubei",   name:"刘备", leader:"刘备", capital:"pinyuan" },
  { id:"sunjian",  name:"孙坚", leader:"孙坚", capital:"changsha" },
  { id:"libiao",   name:"刘表", leader:"刘表", capital:"xiangyang" },
];
const forceById = id => FORCES.find(f => f.id === id);
const forceByCapital = nid => FORCES.find(f => f.capital === nid);

// 侠客官职（功绩晋升）
const RANKS = [
  { name:"步卒",   merit:0 },
  { name:"伍长",   merit:20 },
  { name:"什长",   merit:50 },
  { name:"百人将", merit:100 },
  { name:"部曲将", merit:180 },
  { name:"中郎将", merit:300 },
  { name:"将军",   merit:500 },
];
function rankOfMerit(merit) {
  let r = RANKS[0];
  for (const rk of RANKS) if (merit >= rk.merit) r = rk;
  return r;
}

// 行囊容量
const CARRY_MAX = 10;
const BUSINESS_LV_MAX = 5;

// 非交易类道具（医者配药产物、名刀等）
const EXTRA_ITEMS = [
  { id:"dan",     name:"金创药", desc:"医者调配的伤药" },
  { id:"mingdao", name:"名刀",   desc:"名匠锻造的利刃（佩戴后武力+2）" },
];
const itemName = id => {
  const gd = window.GAME_DATA || {};
  const g = goodById(id)
    || EXTRA_ITEMS.find(i => i.id === id)
    || (gd.ITEMS || []).find(i => i.id === id);
  return g ? g.name : "未知物品";
};

/* ============================================================
   二、全局状态
   ============================================================ */
let G = null;                 // 游戏主状态（存档即序列化此对象）
let busy = false;             // 是否正在执行多日行动（移动等）
let eventQueue = [];          // 事件弹窗队列
let modalResolver = null;     // 当前弹窗的 Promise resolve

// Canvas 渲染相关
const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext("2d");
let viewW = 1000, viewH = 700;                 // 逻辑视图尺寸
let playerRender = { x: 400, y: 300 };         // 玩家标记的平滑插值位置
let selectedNode = null;                       // 鼠标悬停节点
let particles = [];                            // 季节粒子（雪/落叶/柳絮）

/* ============================================================
   三、工具函数
   ============================================================ */
const $ = id => document.getElementById(id);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function weightedPick(list) {
  const total = list.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of list) { r -= e.w; if (r <= 0) return e; }
  return list[0];
}

function showToast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 2200);
}

function log(text, cls = "") {
  const panel = $("log-panel");
  const p = document.createElement("p");
  if (cls) p.className = cls;
  const date = `<span class="log-date">【${G.date.y}年${G.date.m}月${G.date.d}日】</span>`;
  p.innerHTML = date + text;
  panel.prepend(p);
  while (panel.children.length > 60) panel.removeChild(panel.lastChild);
}

/* ============================================================
   四、时间系统：1 行动 = 1 天；每月 30 天，每年 12 月
   ============================================================ */
const SEASONS = ["冬","春","春","春","夏","夏","夏","秋","秋","秋","冬","冬"]; // 月->季(农历近似)

function seasonOf(m) { return SEASONS[m - 1]; }

function advanceDay() {
  G.date.d++;
  if (G.date.d > 30) {
    G.date.d = 1;
    G.date.m++;
    if (G.date.m > 12) { G.date.m = 1; G.date.y++; log(`<b class="log-event">新年伊始，${G.date.y} 年到了。</b>`); }
    else log(`—— ${G.date.m} 月 ——`);
  }
  // 历史事件判定
  for (const ev of HISTORICAL_EVENTS) {
    const key = `${ev.y}-${ev.m}-${ev.d}`;
    if (key === `${G.date.y}-${G.date.m}-${G.date.d}` && !G.seenEvents.includes(key)) {
      G.seenEvents.push(key);
      log(`<b class="log-event">【历史】${ev.title}</b>：${ev.text}`);
      if (ev.fame) { G.fame += ev.fame; }
      queueEvent({ title: ev.title, text: ev.text, options:[{ label:"感慨万千", effect:"none" }] });
    }
  }
  // 每日自然消耗（吃饭住店）
  if (G.date.d % 10 === 0) {
    const fee = 20;
    if (G.money >= fee) G.money -= fee;
    else { G.money = 0; G.hp = Math.max(5, G.hp - 20); log(`<span class="log-bad">囊中羞涩，只能节衣缩食…</span>`); }
    log(`食宿开销 ${fee} 贯。`);
  }
  // 店铺被动收入（旬末结算日志）
  if (G.shop) {
    const inc = G.shop.level * (G.location === G.shop.city ? rand(6, 12) : rand(2, 5));
    G.money += inc;
    G.shopAcc += inc;
    if (G.date.d % 10 === 0) {
      log(`<span class="log-good">商号旬末结算：本旬进账 ${G.shopAcc} 贯。</span>`);
      G.shopAcc = 0;
    }
  }
  autosave();
  updateHUD();
}

/* ============================================================
   五、事件弹窗系统（Promise 化，可排队）
   ============================================================ */
function queueEvent(evt) { eventQueue.push(evt); processEventQueue(); }

function processEventQueue() {
  if (modalResolver || eventQueue.length === 0) return;
  const evt = eventQueue.shift();
  $("event-title").textContent = evt.title;
  $("event-text").textContent = evt.text;
  const box = $("event-options");
  box.innerHTML = "";
  $("event-modal").classList.remove("hidden");
  return new Promise(resolve => {
    modalResolver = resolve;
    evt.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = opt.label;
      btn.onclick = () => {
        $("event-modal").classList.add("hidden");
        const r = modalResolver;
        modalResolver = null;
        applyEventEffect(opt.effect, evt);
        r && r(opt);
        processEventQueue();
      };
      box.appendChild(btn);
    });
  });
}

function applyEventEffect(effect, evt) {
  switch (effect) {
    case "fight_bandit": {
      // Phase 3：山贼遭遇战升级为真实单挑小游戏
      startDuel(
        { name: "山贼头目", force: 55 + rand(0, 20), hp: 90 + rand(0, 30) },
        () => {
          const loot = rand(80, 200);
          G.money += loot; G.fame += 2;
          log(`<span class="log-good">力战山贼获胜！缴获 ${loot} 贯。</span>`);
          updateHUD();
        },
        () => {
          const lost = Math.min(G.money, rand(40, 120));
          G.money -= lost;
          G.hp = Math.max(5, G.hp - 15);
          log(`<span class="log-bad">单挑落败，负伤突围，损失 ${lost} 贯。</span>`);
          updateHUD();
        }
      );
      break;
    }
    case "lose_money": {
      const lost = Math.floor(G.money * 0.2);
      G.money -= lost;
      log(`<span class="log-bad">交出买路财 ${lost} 贯，得以通行。</span>`);
      break;
    }
    case "meet_merchant": {
      G.money += 30;
      log(`<span class="log-good">商人赠予盘缠 30 贯，并透露各地物价消息（Phase 2 开放跑商）。</span>`);
      break;
    }
    case "meet_sage": {
      G.stats.wit += rand(1, 2);
      G.fame += 2;
      log(`<span class="log-good">与隐士论道，智力+，名声+2。</span>`);
      break;
    }
    case "storm": {
      G.hp = Math.max(5, G.hp - 15);
      log(`<span class="log-bad">淋得浑身湿透，体力-15。</span>`);
      break;
    }
    case "help_villagers": {
      if (G.money >= 50) { G.money -= 50; G.fame += 3; log(`<span class="log-good">施舍银两，村民感恩戴德，名声+3。</span>`); }
      else log(`<span class="log-bad">身无长物，只能黯然离去。</span>`);
      break;
    }
  }
  updateHUD();
}

/* ============================================================
   六、角色与存档
   ============================================================ */
function newState(name, identity) {
  return {
    name,
    identity,
    date: { y: 184, m: 1, d: 1 },
    location: "luoyang",
    stats: { leader: 50, force: 60, wit: 50, politics: 50, charm: 55 },
    hp: 100, hpMax: 100,
    money: 150, fame: 0,
    seenEvents: [],
    skills: { businessXp: 0 },   // Phase 3 生活技能进度
    inventory: {},               // Phase 2 跑商货物 { goodId: count }
    serve: null,                 // 侠客仕官的势力 id
    merit: 0,                    // 功绩
    quest: null,                 // 当前任务
    market: null,                // 各地物价 { stamp, prices:{cityId:{goodId:price}} }
    sect: null,                  // 帮主：帮派 { name, city }
    disciples: 0,                // 帮主：门徒数量
    shop: null,                  // 商人：店铺 { city, level }
    shopAcc: 0,                  // 店铺旬内累计进账
    favor: {},                   // Phase 4：对武将的亲密度 { generalId: 0~100 }
    party: [],                   // Phase 4：已招揽入队的武将 id
    flags: {},                   // 一次性事件标记（如名刀已锻成）
  };
}

function autosave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(G));
    return true;
  } catch (e) { console.error("存档失败", e); return false; }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* ============================================================
   七、大地图：邻接表 + 移动
   ============================================================ */
function buildAdjacency() {
  const adj = {};
  NODES.forEach(n => adj[n.id] = []);
  EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  return adj;
}
const ADJ = buildAdjacency();

const nodeById = id => NODES.find(n => n.id === id);

function travelDays(fromId, toId) {
  const a = nodeById(fromId), b = nodeById(toId);
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.max(1, Math.round(dist / 85));
}

async function travelTo(targetId) {
  if (busy) return;
  if (!ADJ[G.location].includes(targetId)) { showToast("只能移动到相邻节点！"); return; }
  const days = travelDays(G.location, targetId);
  busy = true;
  setActionEnabled(false);
  const target = nodeById(targetId);
  for (let i = 0; i < days; i++) {
    // 每日路程消耗与随机事件
    G.hp = Math.max(5, G.hp - 5);
    if (Math.random() < 0.28) {
      const ev = { ...weightedPick(RANDOM_ROAD_EVENTS) };
      await processEventQueue();           // 先清空历史事件弹窗
      queueEvent({ title: ev.title, text: ev.text, options: ev.options });
      await new Promise(r => { const iv = setInterval(() => {
        if (!modalResolver && !duel.active && !debate.active) { clearInterval(iv); r(); }
      }, 100); });
    }
    advanceDay();
    await wait(220); // 配合标记移动动画的节奏
  }
  G.location = targetId;
  log(`抵达<b>${target.name}</b>——${target.desc}`);
  if (target.type === "港") log(`<span class="log-good">码头商船云集（Phase 2 开放海贼水战与跑商）。</span>`);
  busy = false;
  setActionEnabled(true);
  autosave();
  updateHUD();
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/* ============================================================
   八、城内行动
   ============================================================ */
async function doAction(key) {
  if (busy || !G) return;
  const act = ACTIONS[key];
  if (key !== "rest" && G.hp < act.hp) { showToast("体力不足，先休息吧！"); return; }

  busy = true; setActionEnabled(false);

  if (key !== "rest") G.hp -= act.hp;

  switch (key) {
    case "rest":
      G.hp = Math.min(G.hpMax, G.hp + rand(40, 60));
      log(`在客栈美美睡了一觉，体力恢复。`);
      break;
    case "train": {
      const gain = rand(1, 2);
      G.stats.force += gain;
      log(`在武馆挥汗如雨，<span class="log-good">武力+${gain}</span>。（Phase 3 将加入剑术 QTE 小游戏）`);
      break;
    }
    case "study": {
      const gain = rand(1, 2);
      const key = Math.random() < 0.5 ? "wit" : "politics";
      G.stats[key] += gain;
      const cnName = key === "wit" ? "智力" : "政治";
      log(`在书院抄书苦读，<span class="log-good">${cnName}+${gain}</span>。`);
      break;
    }
    case "social": {
      // Phase 3：35% 概率触发舌战切磋
      if (Math.random() < 0.35) {
        const won = await new Promise(res => startDebate(
          { name: pick(["水镜先生", "名士", "博学鸿儒", "告老尚书"]), wit: 55 + rand(0, 20), hp: 80 + rand(0, 20) },
          () => res(true), () => res(false)
        ));
        if (won) {
          G.stats.charm += 1; G.stats.wit += 1; G.fame += rand(2, 4);
          log(`<span class="log-good">与名士舌战获胜！对方折服于你的辩才，魅力+1、智力+1、名声上升。</span>`);
        } else {
          G.stats.wit += 1;
          log(`<span class="log-bad">舌战落败，但你虚心求教，从对方的雄辩中学得几分道理，智力+1。</span>`);
        }
      } else if (Math.random() < 0.7) { G.stats.charm += 1; G.fame += rand(1, 3); log(`与当地名士品茶清谈，<span class="log-good">魅力+1，名声上升</span>。`); }
      else log(`名士闭门谢客，只好改日再来。`);
      break;
    }
    case "work": {
      const pay = rand(30, 80);
      G.money += pay;
      log(`在市集帮工一日，赚得 ${pay} 贯。（Phase 2 开放商人店铺与算术小游戏）`);
      break;
    }
    case "search": {
      const r = Math.random();
      if (r < 0.15) { const found = rand(50, 150); G.money += found; log(`<span class="log-good">意外发现一处窖藏，得到 ${found} 贯！</span>`); }
      else if (r < 0.3) { G.fame += rand(2, 5); log(`<span class="log-good">帮助乡民调解纠纷，名声上升！</span>`); }
      else if (r < 0.45) { G.hp = Math.max(5, G.hp - 10); log(`<span class="log-bad">摔进路边的土坑，狼狈不堪，体力-10。</span>`); }
      else log(`四处闲逛，倒也风平浪静。（Phase 3 探索将产出药材、矿石等材料）`);
      break;
    }
  }

  advanceDay();
  await wait(150);
  busy = false; setActionEnabled(true);
  updateHUD();
}

function setActionEnabled(enabled) {
  document.querySelectorAll("#action-buttons .btn").forEach(b => b.disabled = !enabled);
}

/* ============================================================
   九、HUD 刷新
   ============================================================ */
function updateHUD() {
  $("date-display").textContent = `${eraName(G.date.y)}年 ${cnMonth(G.date.m)}月 ${cnDay(G.date.d)}日`;
  $("season-display").textContent = seasonOf(G.date.m);
  $("res-identity").textContent = G.identity;
  $("res-money").textContent = G.money;
  $("res-hp").textContent = G.hp;
  $("res-hp-max").textContent = G.hpMax;
  $("res-fame").textContent = G.fame;
  $("res-location").textContent = nodeById(G.location).name;
  $("char-name").innerHTML = `${G.name} <small>· ${IDENTITIES[G.identity].title}</small>`;
  $("st-leader").textContent = G.stats.leader;
  $("st-force").textContent = G.stats.force;
  $("st-wit").textContent = G.stats.wit;
  $("st-politics").textContent = G.stats.politics;
  $("st-charm").textContent = G.stats.charm;

  // Phase 2：官职 / 商才 + 行囊
  if (G.identity === "侠客" && G.serve) {
    $("res-title").textContent = forceById(G.serve).name + "·" + rankOfMerit(G.merit).name;
  } else if (G.identity === "商人") {
    $("res-title").textContent = "商才" + businessLevel() + "级";
  } else {
    $("res-title").textContent = "-";
  }
  const bag = $("bag-list");
  const items = Object.entries(G.inventory).filter(([, n]) => n > 0);
  $("bag-cap").textContent = `（${items.reduce((s, [, n]) => s + n, 0)}/${CARRY_MAX}）`;
  bag.innerHTML = items.length
    ? items.map(([gid, n]) => `<span class="bag-item">${itemName(gid)}×${n}</span>`).join("")
    : "空空如也";

  // Phase 4：同行武将
  const GD = window.GAME_DATA || {};
  const party = (G.party || []).map(id => (GD.GENERALS || []).find(g => g.id === id)).filter(Boolean);
  $("party-list").innerHTML = party.length
    ? party.map(g => `<span class="bag-item">🗡 ${g.name}</span>`).join("")
    : "尚无同伴";

  // Phase 4+：技艺等级
  const lv = k => Math.min(5, Math.floor((G.skills[k] || 0) / 10));
  $("skill-list").innerHTML =
    `茶道 <b>${lv("teaXp")}</b> 级　医术 <b>${lv("medXp")}</b> 级　锻冶 <b>${lv("smithXp")}</b> 级`;
}

// 年号换算（184=中平元年，190=初平元年，196=建安元年，其余用 年号+X）
function eraName(y) {
  if (y < 190) return `中平${y - 183}`;
  if (y < 196) return `初平${y - 189}`;
  if (y < 220) return `建安${y - 195}`;
  return `黄初${y - 219}`;
}
const CN_NUM = ["","一","二","三","四","五","六","七","八","九","十"];
const cnMonth = m => m <= 10 ? CN_NUM[m] : (m === 11 ? "十一" : "十二");
const cnDay = d => {
  if (d <= 10) return CN_NUM[d];
  if (d < 20) return "十" + CN_NUM[d - 10];
  if (d === 20) return "二十";
  if (d < 30) return "二十" + CN_NUM[d - 20];
  return "三十";
};

/* ============================================================
   八点五、Phase 2：跑商物价系统
   ============================================================ */
// 每旬（10 天）刷新一次各地物价
function periodIndex() {
  return (G.date.y * 12 + G.date.m) * 10 + Math.floor((G.date.d - 1) / 10);
}

function ensureMarket() {
  if (G.market && G.market.stamp === periodIndex()) return;
  const stamp = periodIndex();
  const prices = {};
  NODES.forEach(n => {
    const spec = CITY_SPECIALTY[n.id] || {};
    prices[n.id] = {};
    GOODS.forEach(g => {
      const mult = (spec[g.id] !== undefined ? spec[g.id] : (spec.default || 1.0));
      const season = g.peak.includes(G.date.m) ? 1.45 : g.trough.includes(G.date.m) ? 0.8 : 1.0;
      const noise = 0.9 + Math.random() * 0.25;
      prices[n.id][g.id] = Math.max(2, Math.round(g.base * mult * season * noise));
    });
  });
  G.market = { stamp, prices };
  autosave();
}

function businessLevel() {
  return Math.min(BUSINESS_LV_MAX, Math.floor((G.skills.businessXp || 0) / 10));
}
function buyPriceOf(price)  { return Math.round(price * (1 - 0.02 * businessLevel())); }
function sellPriceOf(price) { return Math.round(price * (1 + 0.02 * businessLevel())); }
function carriedCount() {
  return Object.values(G.inventory).reduce((s, n) => s + n, 0);
}

/* --- 市集交易弹窗 --- */
function openTrade() {
  ensureMarket();
  renderTrade();
  $("trade-modal").classList.remove("hidden");
}

function renderTrade() {
  const here = nodeById(G.location);
  $("trade-title").textContent = `${here.name} · 市集`;
  $("trade-info").innerHTML =
    `金钱：<b>${G.money}</b> 贯　行囊：<b>${carriedCount()}/${CARRY_MAX}</b>　商才：<b>${businessLevel()} 级</b>` +
    `（买卖各 2%/级加成）　本旬物价已刷新`;

  const list = $("trade-list");
  list.innerHTML = "";
  GOODS.forEach(g => {
    const raw = G.market.prices[G.location][g.id];
    const buy = buyPriceOf(raw), sell = sellPriceOf(raw);
    const held = G.inventory[g.id] || 0;

    // 标签：应季 / 淡季 / 本地特产
    let tags = "";
    if (g.peak.includes(G.date.m)) tags += `<span class="tag">应季 高价</span>`;
    if (g.trough.includes(G.date.m)) tags += `<span class="tag dim">淡季 低价</span>`;
    const spec = CITY_SPECIALTY[G.location] || {};
    if (spec[g.id] !== undefined && spec[g.id] < 0.88) tags += `<span class="tag spec">本地特产</span>`;

    const row = document.createElement("div");
    row.className = "trade-row";
    row.innerHTML = `
      <span class="good-name">${g.name}<br><small class="held">${g.desc}</small></span>
      <span class="good-price">${raw} 贯</span>
      <span>${tags || "—"}</span>
      <span class="held">持有 ${held}</span>
      <button class="btn btn-small" data-act="buy">买入<br><small>${buy} 贯</small></button>
      <button class="btn btn-small" data-act="sell" ${held === 0 ? "disabled" : ""}>卖出<br><small>${sell} 贯</small></button>`;
    row.querySelector('[data-act="buy"]').onclick = () => tradeGoods(g.id, "buy", raw);
    row.querySelector('[data-act="sell"]').onclick = () => tradeGoods(g.id, "sell", raw);
    list.appendChild(row);
  });

  // Phase 4：名品/礼品区（只能购买，用于赠武将）
  const gd = window.GAME_DATA || {};
  const sec = document.createElement("div");
  sec.className = "trade-section";
  sec.textContent = "—— 名品 · 礼品（赠予武将可大幅提升亲密度） ——";
  list.appendChild(sec);
  (gd.ITEMS || []).forEach(item => {
    const held = G.inventory[item.id] || 0;
    const row = document.createElement("div");
    row.className = "trade-row";
    row.innerHTML = `
      <span class="good-name">${item.name}<br><small class="held">${item.desc}</small></span>
      <span class="good-price">${item.price} 贯</span>
      <span>—</span>
      <span class="held">持有 ${held}</span>
      <button class="btn btn-small" data-act="buy2">买入<br><small>${item.price} 贯</small></button>
      <button class="btn btn-small" disabled>—</button>`;
    row.querySelector('[data-act="buy2"]').onclick = () => {
      if (carriedCount() >= CARRY_MAX) { showToast("行囊已满！"); return; }
      if (G.money < item.price) { showToast("金钱不足！"); return; }
      G.money -= item.price;
      G.inventory[item.id] = (G.inventory[item.id] || 0) + 1;
      log(`购得名品「${item.name}」。`);
      autosave(); updateHUD(); renderTrade();
    };
    list.appendChild(row);
  });
}

function tradeGoods(gid, act, raw) {
  const g = goodById(gid);
  if (act === "buy") {
    if (carriedCount() >= CARRY_MAX) { showToast("行囊已满！"); return; }
    const cost = buyPriceOf(raw);
    if (G.money < cost) { showToast("金钱不足！"); return; }
    G.money -= cost;
    G.inventory[gid] = (G.inventory[gid] || 0) + 1;
    G.skills.businessXp = (G.skills.businessXp || 0) + 1;
    log(`买入${g.name}，花费 ${cost} 贯。`);
  } else {
    if (!(G.inventory[gid] > 0)) return;
    const gain = sellPriceOf(raw);
    G.money += gain;
    G.inventory[gid] -= 1;
    G.skills.businessXp = (G.skills.businessXp || 0) + 1;
    const prof = gain - Math.round(g.base);
    log(`卖出${g.name}，得 ${gain} 贯。${prof > 0 ? '<span class="log-good">有赚头！</span>' : '<span class="log-bad">折本了…</span>'}`);
  }
  autosave();
  updateHUD();
  renderTrade();
}

/* ============================================================
   八点六、Phase 2：身份面板 / 转职 / 侠客仕官
   ============================================================ */
function openIdentityPanel() { renderIdentityPanel(); $("identity-modal").classList.remove("hidden"); }

function renderIdentityPanel() {
  const body = $("identity-body");
  const acts = $("identity-actions");
  $("identity-title").textContent = `身份面板 · ${G.identity}`;
  body.innerHTML = "";
  acts.innerHTML = "";

  // ---- 身份专属内容 ----
  if (G.identity === "侠客") {
    body.innerHTML += `<h3>仕途</h3>`;
    if (G.serve) {
      const f = forceById(G.serve);
      const rk = rankOfMerit(G.merit);
      const next = RANKS[RANKS.indexOf(rk) + 1];
      const pct = next ? Math.min(100, Math.round((G.merit - rk.merit) / (next.merit - rk.merit) * 100)) : 100;
      body.innerHTML += `
        <p>效忠于<b>${f.name}</b>　官职：<b>${rk.name}</b>　功绩：<b>${G.merit}</b></p>
        <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
        <p class="muted">${next ? `晋升「${next.name}」还需功绩 ${next.merit - G.merit}` : "已位极人臣！"}</p>`;
      if (G.quest) {
        body.innerHTML += `<p>当前任务：<b>${G.quest.desc}</b>（${G.quest.state}）</p>`;
      }
    } else {
      body.innerHTML += `<p class="muted">尚未出仕。前往势力都城投效，建立功业。</p>
        <p class="muted">势力都城：${FORCES.map(f => `${f.name}→${nodeById(f.capital).name}`).join("、")}</p>`;
    }
  } else if (G.identity === "商人") {
    body.innerHTML += `<h3>商途</h3>
      <p>商才：<b>${businessLevel()} 级</b>（经验 ${G.skills.businessXp || 0}/${(businessLevel() + 1) * 10}）</p>
      <p class="muted">「低买高卖」：绿色<b>本地特产</b>便宜宜买入，金色<b>应季</b>货物高价宜卖出。每旬物价刷新。</p>
      <p class="muted">经典生意经：冬卖木炭、夏卖扇子、青黄不接卖粮草。</p>`;
    if (G.shop) {
      body.innerHTML += `<p>产业：<b>${nodeById(G.shop.city).name}·商号（${G.shop.level} 级）</b>
        每日进账约 ${G.shop.level * 9} 贯（亲临督导收益更高，旬末结算）。</p>`;
    }
  } else if (G.identity === "间谍") {
    body.innerHTML += `<h3>谍网</h3>
      <p>暗杀成功率 ≈ <b>${Math.min(95, G.stats.force + Math.floor(G.stats.wit / 2) + 20)}%</b></p>
      <p class="muted">打探情报可卖给各方诸侯换钱；暗杀名震天下者可获巨额悬赏，但失手代价惨重；纵火破坏需在城中进行。</p>`;
  } else if (G.identity === "海贼") {
    body.innerHTML += `<h3>水寇生涯</h3>
      <p>帮众：<b>${G.disciples}</b> 人　刀法：<b>${G.stats.force}</b></p>
      <p class="muted">在<b>港口（⚓）</b>可劫掠商船，来钱最快但名声受损；操练刀法水战（Phase 3 后开放水战合战）。</p>`;
  } else if (G.identity === "医生") {
    const herbCnt = G.inventory["yao"] || 0, danCnt = G.inventory["dan"] || 0;
    body.innerHTML += `<h3>医道</h3>
      <p>药材：<b>${herbCnt}</b> 份　金创药：<b>${danCnt}</b> 份</p>
      <p class="muted">在<b>山林（⛰）/村庄（🍃）</b>采药，集齐 2 份药材可配一瓶金创药；在城中义诊积攒名声，救人一命胜造七级浮屠。</p>`;
  } else if (G.identity === "帮主") {
    body.innerHTML += `<h3>门派</h3>`;
    if (G.sect) {
      body.innerHTML += `<p>门派：<b>${G.sect.name}</b>（总舵：${nodeById(G.sect.city).name}）　门徒：<b>${G.disciples}</b> 人</p>
        <p class="muted">广收门徒壮大实力，定期举办比武大会扬名立万。</p>`;
    } else {
      body.innerHTML += `<p class="muted">尚未开宗立派。需名声 ≥ 80、银钱 ≥ 300，且身在城中。</p>`;
    }
  } else {
    body.innerHTML += `<p class="muted">${IDENTITIES[G.identity].desc}</p>
      <p class="muted">（未知身份，待拓展）</p>`;
  }

  // ---- 行动按钮 ----
  const addBtn = (label, fn, primary = false) => {
    const b = document.createElement("button");
    b.className = "btn" + (primary ? " btn-primary" : "");
    b.innerHTML = label;
    b.onclick = () => { fn(); };
    acts.appendChild(b);
    return b;
  };

  if (G.identity === "商人") {
    const canTrade = ["城", "港"].includes(nodeById(G.location).type);
    addBtn(`前往市集${canTrade ? "" : "（需在城/港）"}`, () => {
      if (!canTrade) { showToast("村庄没有市集，去城里吧。"); return; }
      $("identity-modal").classList.add("hidden");
      openTrade();
    }, true);
    const here = nodeById(G.location);
    if (!G.shop) {
      addBtn(`开设商号（300 贯，需商才2级）`, () => openShop());
    } else if (G.shop.city === G.location && G.shop.level < 3) {
      addBtn(`扩建商号至 ${G.shop.level + 1} 级（200 贯）`, () => upgradeShop());
    }
    if (G.shop && G.shop.city !== G.location && ["城","港"].includes(here.type)) {
      addBtn("异地设立分号", () => moveShop());
    }
  }

  if (G.identity === "间谍") {
    addBtn("打探情报（20 贯）", () => spyIntel(), true);
    addBtn("暗杀名士", () => spyAssassinate());
    addBtn("纵火破坏（需在城）", () => spySabotage());
  }

  if (G.identity === "海贼") {
    const isPort = nodeById(G.location).type === "港";
    addBtn(`劫掠商船${isPort ? "" : "（需在港⚓）"}`, () => pirateRaid(), true);
    addBtn("操练刀法水战", () => pirateDrill());
  }

  if (G.identity === "医生") {
    const t = nodeById(G.location).type;
    const canGather = ["山林", "村"].includes(t);
    addBtn(`上山采药${canGather ? "" : "（需在山林/村）"}`, () => gatherHerbs(), true);
    addBtn("配药（2 药材→1 药）", () => craftMedicine());
    addBtn("悬壶义诊（需在城）", () => freeClinic());
  }

  if (G.identity === "帮主") {
    if (!G.sect) {
      addBtn("开宗立派（名80/钱300/在城）", () => foundSect(), true);
    } else {
      addBtn("广收门徒", () => recruitDisciple(), true);
      addBtn("举办比武大会", () => holdTournament());
    }
  }

  if (G.identity === "侠客") {
    const fc = forceByCapital(G.location);
    if (!G.serve && fc) {
      addBtn(`仕官于 ${fc.name}`, () => joinForce(fc), true);
    } else if (G.serve) {
      if (!G.quest) addBtn("领取任务", () => takeQuest(), true);
      else if (G.quest.state === "进行中") addBtn("执行任务", () => execQuest(), true);
      addBtn("请战出征（合战）", () => startCampaign(), true);
      addBtn("向主公辞官", () => quitForce());
    }
  }

  // ---- 转职 ----
  body.innerHTML += `<h3>改换身份</h3><p class="muted">乱世之中，身份可随时转变（辞官将失去官职与功绩）。</p>`;
  const row = document.createElement("div");
  row.className = "row";
  Object.keys(IDENTITIES).filter(id => id !== G.identity).forEach(id => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = id;
    b.onclick = () => changeIdentity(id);
    row.appendChild(b);
  });
  acts.appendChild(row);
}

function changeIdentity(newId) {
  if (!confirm(`确定改换身份为「${newId}」吗？`)) return;
  if (G.serve && newId !== "侠客") {
    log(`你向${forceById(G.serve).name}递交辞呈，脱离仕途。`);
    G.serve = null; G.merit = 0; G.quest = null;
  }
  G.identity = newId;
  log(`<b>身份变更</b>：如今你是一名「${newId}」——${IDENTITIES[newId].desc}`);
  updateHUD();
  autosave();
  renderIdentityPanel();
  showToast(`已转职为「${newId}」`);
}

/* --- 侠客：仕官 / 任务 --- */
async function joinForce(fc) {
  const score = Math.round((G.stats.charm + G.stats.politics) / 2 + G.fame / 2);
  if (score < 50) {
    log(`你求见${fc.leader}被门客拦下——默默无闻之人，须先扬名立万。门客冷笑：“你若能说得过我，我便为你通传。”`);
    // Phase 3：舌战说服门客
    const won = await new Promise(res => startDebate(
      { name: `${fc.name}府上门客`, wit: 45 + rand(0, 25), hp: 70 + rand(0, 20) },
      () => res(true), () => res(false)
    ));
    if (!won) {
      advanceDay();
      log(`<span class="log-bad">舌战失利，悻悻而归。</span>`);
      return;
    }
    log(`<span class="log-good">一番雄辩令门客心服口服，遂为你通传！</span>`);
  }
  G.serve = fc.id;
  G.merit = Math.floor(score / 10);
  G.fame += 5;
  advanceDay();
  log(`<span class="log-good">仕官成功！${fc.leader}赏识你的才干，授予初职「${rankOfMerit(G.merit).name}」，功绩 ${G.merit}。</span>`);
  updateHUD();
  autosave();
  renderIdentityPanel();
}

function takeQuest() {
  const types = [
    { type:"bandit",  desc:"讨伐为祸乡里的山贼" },
    { type:"escort",  desc:"押送军粮前往邻郡" },
    { type:"patrol",  desc:"巡夜治安，弹压盗匪" },
  ];
  G.quest = { ...pick(types), state:"进行中" };
  log(`接下任务：<b>${G.quest.desc}</b>。`);
  autosave();
  renderIdentityPanel();
}

async function execQuest() {
  if (busy) return;
  busy = true; setActionEnabled(false);
  $("identity-modal").classList.add("hidden");
  const q = G.quest;
  const meritBefore = G.merit;
  let ok = false;

  if (q.type === "bandit") {
    // Phase 3：讨伐山贼任务 → 真实单挑
    ok = await new Promise(res => startDuel(
      { name: "山贼头目", force: 60 + rand(0, 15), hp: 100 + rand(0, 20) },
      () => res(true), () => res(false)
    ));
    advanceDay();
  } else if (q.type === "escort") {
    ok = G.stats.politics + rand(0, 40) >= 70;
    for (let i = 0; i < 3; i++) { advanceDay(); await wait(150); }
    log(ok ? `<span class="log-good">粮车安抵目的地，颗粒无损。</span>` : `<span class="log-bad">半路遇雨，粮草损了些。</span>`);
  } else {
    ok = G.stats.charm + rand(0, 40) >= 80;
    advanceDay();
    log(ok ? `<span class="log-good">巡夜有方，盗匪绝迹，百姓称颂。</span>` : `<span class="log-bad">夜里遭了偷儿，治安考评不佳。</span>`);
  }

  const meritGain = ok ? rand(10, 18) : rand(2, 5);
  const pay = ok ? rand(60, 120) : rand(10, 30);
  G.merit += meritGain;
  G.money += pay;
  const before = rankOfMerit(meritBefore).name, after = rankOfMerit(G.merit).name;
  G.quest = null;
  log(`复命：功绩+${meritGain}，赏钱 ${pay} 贯。${before !== after ? `<b class="log-good">晋升为「${after}」！</b>` : ""}`);
  busy = false; setActionEnabled(true);
  updateHUD();
  autosave();
  renderIdentityPanel();
  $("identity-modal").classList.remove("hidden");
}

function quitForce() {
  if (!confirm("确定辞官吗？功绩将清零。")) return;
  log(`你向${forceById(G.serve).name}递交辞呈，回归江湖。`);
  G.serve = null; G.merit = 0; G.quest = null;
  updateHUD();
  autosave();
  renderIdentityPanel();
}

/* --- 商人：开店 --- */
function openShop() {
  if (businessLevel() < 2) { showToast("商才需 2 级才能开店！"); return; }
  if (!["城", "港"].includes(nodeById(G.location).type)) { showToast("需在城或港开设商号。"); return; }
  if (G.money < 300) { showToast("需 300 贯本钱！"); return; }
  if (!confirm(`在${nodeById(G.location).name}开设商号，花费 300 贯？`)) return;
  G.money -= 300;
  G.shop = { city: G.location, level: 1 };
  log(`<span class="log-good">商号开张！${nodeById(G.location).name}的店铺每日进账，旬末结算。</span>`);
  afterAction();
}

function upgradeShop() {
  if (G.money < 200) { showToast("需 200 贯！"); return; }
  if (!confirm(`扩建商号至 ${G.shop.level + 1} 级，花费 200 贯？`)) return;
  G.money -= 200;
  G.shop.level++;
  log(`<span class="log-good">商号扩建完工，日进斗金指日可待。</span>`);
  afterAction();
}

function moveShop() {
  if (!confirm(`将总号迁往${nodeById(G.location).name}？`)) return;
  log(`总号迁往${nodeById(G.location).name}，旧铺转为分号。`);
  G.shop.city = G.location;
  afterAction();
}

/* --- 间谍 --- */
function spyIntel() {
  if (G.money < 20) { showToast("需 20 贿金！"); return; }
  G.money -= 20;
  const info = rand(40, 80);
  G.money += info;
  if (Math.random() < 0.4) G.stats.wit += 1;
  log(`重金买通眼线，打探到要紧消息转卖诸侯，净赚 ${info - 20} 贯。`);
  afterAction();
}

function spyAssassinate() {
  const targets = ["董卓", "曹操", "袁绍", "刘表", "孙坚", "刘备"];
  const target = pick(targets);
  const success = G.stats.force + Math.floor(G.stats.wit / 2) + rand(0, 40) >= 110;
  if (success) {
    const bounty = rand(150, 300);
    G.money += bounty;
    G.fame += 15;
    log(`<span class="log-good">夜探敌营，一击得手！${target}麾下大将授首，悬赏 ${bounty} 贯到手，恶名与威名并传天下。</span>`);
  } else {
    G.hp = Math.max(5, G.hp - 30);
    if (G.money >= 100) { G.money -= 100; log(`<span class="log-bad">行刺${target}的亲卫失手！重伤逃脱，花 100 贯贿赂守卒才捡回性命。</span>`); }
    else { G.fame = Math.max(0, G.fame - 5); log(`<span class="log-bad">行刺失手被擒，饱受拷打后越狱而逃，狼狈不堪。</span>`); }
  }
  afterAction();
}

function spySabotage() {
  if (nodeById(G.location).type !== "城") { showToast("破坏行动需在城中进行。"); return; }
  const success = G.stats.wit + rand(0, 40) >= 85;
  if (success) {
    const pay = rand(80, 160);
    G.money += pay;
    log(`<span class="log-good">火烧粮仓，全城大乱！雇主酬金 ${pay} 贯已由密道送来。</span>`);
  } else {
    G.hp = Math.max(5, G.hp - 15);
    log(`<span class="log-bad">放火时被巡夜兵丁发现，且战且退，负了点轻伤。</span>`);
  }
  afterAction();
}

/* --- 海贼 --- */
function pirateRaid() {
  if (nodeById(G.location).type !== "港") { showToast("劫掠需在港口进行！"); return; }
  const success = G.stats.force + G.disciples * 2 + rand(0, 40) >= 85;
  if (success) {
    const loot = rand(100, 250) + G.disciples * 10;
    G.money += loot;
    G.fame = Math.max(0, G.fame - 2);
    log(`<span class="log-good">扬帆出击，劫得商船货款 ${loot} 贯！沿岸商旅闻风丧胆。</span>`);
  } else {
    G.hp = Math.max(5, G.hp - 20);
    G.fame = Math.max(0, G.fame - 1);
    log(`<span class="log-bad">撞上官军水师巡逻队，仓皇撤回港湾，弟兄们挂了彩。</span>`);
  }
  afterAction();
}

function pirateDrill() {
  const gain = rand(1, 2);
  G.stats.force += gain;
  log(`在沙滩上操练刀法与跳帮战术，<span class="log-good">武力+${gain}</span>。`);
  afterAction();
}

/* --- 医生 --- */
function gatherHerbs() {
  if (!["山林", "村"].includes(nodeById(G.location).type)) { showToast("采药需在山林或村庄！"); return; }
  const got = rand(1, 3);
  G.inventory["yao"] = (G.inventory["yao"] || 0) + got;
  G.hp = Math.max(5, G.hp - 10);
  log(`翻山越岭采得<b>药材×${got}</b>（现存 ${G.inventory["yao"]} 份）。山间露水打湿了衣衫，体力-10。`);
  afterAction();
}

// 配药：Phase 4+ 已升级为「金创药方」组方小游戏（见下方 herbConfirm 相关函数）

function freeClinic() {
  if (nodeById(G.location).type !== "城") { showToast("义诊需在城中摆摊。"); return; }
  const fee = rand(15, 40);
  G.money += fee;
  G.fame += rand(2, 4);
  let extra = "";
  if ((G.inventory["dan"] || 0) > 0 && Math.random() < 0.5) {
    G.inventory["dan"] -= 1;
    G.fame += 2;
    extra = " 更赠金创药救治重伤者，"
  }
  log(`<span class="log-good">悬壶义诊，救死扶伤${extra}得诊金 ${fee} 贯，名声大涨！</span>`);
  afterAction();
}

/* --- 帮主 --- */
function foundSect() {
  if (G.fame < 80) { showToast("名声需达 80，先扬名立万！"); return; }
  if (G.money < 300) { showToast("需 300 贯置办基业！"); return; }
  if (nodeById(G.location).type !== "城") { showToast("开宗立派需在城中购置宅院。"); return; }
  if (!confirm(`耗资 300 贯在此开宗立派，门派定名「${G.name}门」？`)) return;
  G.money -= 300;
  G.sect = { name: `${G.name}门`, city: G.location };
  G.disciples = 3;
  G.fame += 10;
  log(`<span class="log-good">「${G.sect.name}」开山立派！三日之内，已有 ${G.disciples} 名好汉前来投奔。</span>`);
  afterAction();
}

function recruitDisciple() {
  const success = G.stats.charm + G.fame / 10 + rand(0, 40) >= 90;
  if (success) {
    G.disciples += rand(1, 2);
    log(`<span class="log-good">设擂招徒，又收门徒若干（现有 ${G.disciples} 人）。</span>`);
  } else {
    log(`擂台前围观者多，拜师者少——门派威望还需积累。`);
  }
  afterAction();
}

function holdTournament() {
  const success = G.stats.force + G.disciples * 3 + rand(0, 40) >= 110;
  if (success) {
    const prize = 200 + G.disciples * 10;
    G.money += prize;
    G.fame += 10;
    log(`<span class="log-good">比武大会连败十七路好汉，夺得彩头 ${prize} 贯，${G.sect.name}威名远播！</span>`);
  } else {
    G.hp = Math.max(5, G.hp - 20);
    G.fame += 2;
    log(`<span class="log-bad">擂台上遇上硬茬子，苦战落败。虽败犹荣，围观众人倒也喝了几声彩。</span>`);
  }
  afterAction();
}

/* --- 行动收尾（推进 1 天并刷新界面） --- */
function afterAction() {
  advanceDay();
  updateHUD();
  autosave();
  if (!$("identity-modal").classList.contains("hidden")) renderIdentityPanel();
}

/* ============================================================
   八点八、Phase 3：武艺单挑（Canvas QTE 小游戏）
   攻击/防御/蓄力/必杀 + 时机判定条（点击画面或按空格）
   ============================================================ */
const duel = {
  active:false, cv:null, ctx:null,
  p:null, e:null,
  phase:"choose",          // choose | qteAtk | qteDef | enemyWait | over
  msg:"", t:0, special:false,
  bar:{ pos:0.5, dir:1, speed:0.021, critHalf:0.09 },
  onWin:null, onLose:null,
};

function startDuel(enemyCfg, onWin, onLose) {
  const D = duel;
  D.cv = $("duel-canvas"); D.ctx = D.cv.getContext("2d");
  D.p = {
    name: G.name, force: G.stats.force,
    hpMax: 100 + Math.floor(G.stats.force / 2), qi: 0, guard:false,
  };
  D.p.hp = D.p.hpMax;
  D.e = { name: enemyCfg.name, force: enemyCfg.force, hpMax: enemyCfg.hp, qi: 0, guard:false };
  D.e.hp = D.e.hpMax;
  D.onWin = onWin; D.onLose = onLose;
  D.phase = "choose";
  D.msg = `${enemyCfg.name}大喝一声：“可敢与某一战！”`;
  D.bar.pos = 0.5; D.bar.dir = 1;
  $("duel-title").textContent = `单挑 · ${G.name} vs ${enemyCfg.name}`;
  $("duel-modal").classList.remove("hidden");
  renderDuelActions();
  D.active = true;
  D.cv.onclick = () => duelPress();
  requestAnimationFrame(duelLoop);
}

function renderDuelActions() {
  const D = duel;
  const show = D.phase === "choose";
  document.querySelectorAll("#duel-actions .btn").forEach(b => b.style.display = show ? "" : "none");
  $("duel-special-btn").disabled = D.p.qi < 2;
  const logEl = $("duel-log");
  if (!show) {
    logEl.innerHTML = D.phase === "over" ? D.msg
      : `${D.msg}<br><small>—— 看准时机，点击画面或按【空格】——</small>`;
  } else {
    logEl.textContent = D.msg;
  }
}

function duelLoop(ts) {
  const D = duel;
  if (!D.active) return;
  if (D.phase === "qteAtk" || D.phase === "qteDef") {
    D.bar.pos += D.bar.dir * D.bar.speed;
    if (D.bar.pos > 1) { D.bar.pos = 1; D.bar.dir = -1; }
    if (D.bar.pos < 0) { D.bar.pos = 0; D.bar.dir = 1; }
  }
  D.t = ts / 1000;
  drawDuel();
  requestAnimationFrame(duelLoop);
}

function duelPress() {
  const D = duel;
  if (!D.active) return;
  if (D.phase === "qteAtk") {
    const off = Math.abs(D.bar.pos - 0.5);
    let mult, label;
    if (off < D.bar.critHalf) { mult = 2.0; label = "会心一击！"; }
    else if (off < 0.2)       { mult = 1.2; label = "抓住了良机！"; }
    else                      { mult = 0.55; label = "失手了…"; }
    let dmg = Math.round((8 + D.p.force * 0.35 + rand(0, 8)) * mult * (D.special ? 1.6 : 1));
    if (D.e.guard) { dmg = Math.round(dmg * 0.4); D.e.guard = false; }
    D.e.hp -= dmg;
    D.msg = `你${D.special ? "运起杀招，" : ""}挥刀猛攻——${label}造成 <b>${dmg}</b> 伤害！${D.e.guard ? "" : ""}`;
    D.special = false;
    D.phase = "enemyWait";
    renderDuelActions();
    setTimeout(enemyDuelTurn, 900);
  } else if (D.phase === "qteDef") {
    const off = Math.abs(D.bar.pos - 0.5);
    let dmg = Math.round((8 + D.e.force * 0.35 + rand(0, 8)) * (D.specialE ? 1.6 : 1));
    if (off < 0.12) { dmg = Math.round(dmg * 0.3); D.msg = `你凝神看破来势，稳稳格挡！只受 <b>${dmg}</b> 伤害。`; }
    else { D.msg = `未能及时格挡，硬受 <b>${dmg}</b> 伤害！`; }
    D.p.hp -= dmg;
    duelAfterEnemy();
  }
}

function playerDuelAct(type) {
  const D = duel;
  if (!D.active || D.phase !== "choose") return;
  if (type === "attack") { D.special = false; D.enterQTE("出招——看准时机！"); }
  else if (type === "special") {
    if (D.p.qi < 2) return;
    D.p.qi -= 2; D.special = true;
    D.bar.critHalf = 0.055;                 // 必杀的会心区间更窄
    D.enterQTE("杀招蓄势——时机更难把握！");
  }
  else if (type === "guard") { D.p.guard = true; D.msg = "你摆出防御架势，静待敌招。"; enemyDuelTurn(); }
  else if (type === "charge") { D.p.qi = Math.min(3, D.p.qi + 1); D.msg = `你深吸一口气，气势攀升（气力 ${D.p.qi}/3）。`; enemyDuelTurn(); }
}
duel.enterQTE = function (msg) {
  const D = duel;
  D.phase = "qteAtk"; D.bar.pos = 0.5; D.bar.dir = 1;
  if (!D.special) D.bar.critHalf = 0.09;
  D.msg = msg;
  renderDuelActions();
};

function enemyDuelTurn() {
  const D = duel;
  if (!D.active || D.phase === "over") return;
  if (checkDuelEnd()) return;
  const r = Math.random();
  let act;
  if (D.e.qi >= 2 && r < 0.3) act = "special";
  else if (r < 0.6) act = "attack";
  else if (r < 0.8) act = "guard";
  else act = "charge";

  if (act === "guard") {
    D.e.guard = true;
    D.msg = `${D.e.name}收势防御，刀锋密不透风。`;
    duelAfterEnemy();
  } else if (act === "charge") {
    D.e.qi = Math.min(3, D.e.qi + 1);
    D.msg = `${D.e.name}气势陡涨（气力 ${D.e.qi}/3）。`;
    duelAfterEnemy();
  } else {
    D.specialE = act === "special";
    if (D.specialE) D.e.qi -= 2;
    if (D.p.guard) {
      D.p.guard = false;
      let dmg = Math.round((8 + D.e.force * 0.35 + rand(0, 8)) * (D.specialE ? 1.6 : 1) * 0.35);
      D.p.hp -= dmg;
      D.msg = `${D.e.name}${D.specialE ? "杀招袭来，" : "攻来，"}你稳稳架开，只受 <b>${dmg}</b> 伤害。`;
      duelAfterEnemy();
    } else {
      D.phase = "qteDef"; D.bar.pos = 0.5; D.bar.dir = 1;
      D.msg = D.specialE ? `${D.e.name}的杀招已至——快格挡！` : `${D.e.name}大刀攻来——及时格挡！`;
      renderDuelActions();
    }
  }
}

function duelAfterEnemy() {
  const D = duel;
  if (checkDuelEnd()) return;
  D.phase = "choose";
  D.msg += " 轮到你了。";
  renderDuelActions();
}

function checkDuelEnd() {
  const D = duel;
  if (D.e.hp <= 0 || D.p.hp <= 0) {
    D.phase = "over";
    D.win = D.e.hp <= 0;
    D.msg = D.win
      ? `<b class="log-good">胜利！</b>${D.e.name}力竭倒地，抱头鼠窜。`
      : `<b class="log-bad">败北…</b>你身负重伤，险险脱身。`;
    renderDuelActions();
    // 显示"结束"按钮
    const box = $("duel-actions");
    box.innerHTML = "";
    const b = document.createElement("button");
    b.className = "btn btn-primary";
    b.textContent = "战斗结束";
    b.onclick = () => {
      $("duel-modal").classList.add("hidden");
      D.active = false;
      // 恢复标准行动按钮
      rebuildDuelButtons();
      (D.win ? D.onWin : D.onLose) && (D.win ? D.onWin() : D.onLose());
    };
    box.appendChild(b);
    return true;
  }
  return false;
}

// 战斗结束后恢复行动按钮 DOM（结束按钮替换过容器内容）
function rebuildDuelButtons() {
  const box = $("duel-actions");
  box.innerHTML = `
    <button class="btn" data-d="attack">⚔ 攻击</button>
    <button class="btn" data-d="special" id="duel-special-btn">✨ 必杀</button>
    <button class="btn" data-d="guard">🛡 防御</button>
    <button class="btn" data-d="charge">🔥 蓄力</button>`;
  box.querySelectorAll(".btn").forEach(b => {
    b.onclick = () => playerDuelAct(b.dataset.d);
  });
  // 重新绑定 canvas 点击
}

function drawDuel() {
  const D = duel, ctx = D.ctx;
  const W = 720, H = 420;
  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#3a3226"); g.addColorStop(1, "#241f19");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 地面
  ctx.fillStyle = "rgba(201,162,39,0.06)";
  ctx.fillRect(0, 300, W, 120);

  // 顶部 HP 条
  drawDuelBar(ctx, 40, 30, 280, 20, D.p.hp / D.p.hpMax, "#4e7a5a", `${D.p.name}  体力 ${Math.max(0, D.p.hp)}/${D.p.hpMax}`);
  drawDuelBar(ctx, 400, 30, 280, 20, D.e.hp / D.e.hpMax, "#a8322a", `${D.e.name}  体力 ${Math.max(0, D.e.hp)}/${D.e.hpMax}`);
  // 气力
  drawQi(ctx, 40, 60, D.p.qi, "#c9a227");
  drawQi(ctx, 620, 60, D.e.qi, "#c9a227");

  // 武将
  ctx.font = "72px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const bobP = Math.sin(D.t * 2) * 5, bobE = Math.sin(D.t * 2 + 2) * 5;
  ctx.fillText("🤺", 180, 230 + bobP);
  ctx.fillText("👹", 540, 230 + bobE);
  // 兵器特效
  ctx.font = "28px serif";
  ctx.fillText("🗡", 250 + Math.sin(D.t * 3) * 8, 210);
  ctx.fillText("🪓", 470 - Math.sin(D.t * 3) * 8, 210);

  // QTE 时机条
  if (D.phase === "qteAtk" || D.phase === "qteDef") {
    const bx = 60, bw = 600, by = 340, bh = 34;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, by, bw, bh);
    // 良机区
    ctx.fillStyle = "rgba(78,122,90,0.55)";
    ctx.fillRect(bx + bw * 0.3, by, bw * 0.4, bh);
    // 会心区
    ctx.fillStyle = "rgba(201,162,39,0.85)";
    ctx.fillRect(bx + bw * (0.5 - D.bar.critHalf), by, bw * D.bar.critHalf * 2, bh);
    // 指针
    ctx.fillStyle = "#fff";
    ctx.fillRect(bx + bw * D.bar.pos - 3, by - 4, 6, bh + 8);
    ctx.fillStyle = "#e8dcc2"; ctx.font = "14px KaiTi, 楷体, serif";
    ctx.fillText(D.phase === "qteAtk" ? "⚔ 出手时机" : "🛡 格挡时机", W / 2, by - 14);
  }

  // 消息由 renderDuelActions 负责刷新，此处仅收尾
  ctx.fillStyle = "rgba(232,220,194,0.9)";
  ctx.font = "16px KaiTi, 楷体, serif";
  ctx.textAlign = "center";
}

function drawDuelBar(ctx, x, y, w, h, ratio, color, label) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, ratio)), h - 4);
  ctx.strokeStyle = "rgba(232,220,194,0.5)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#f0e6cd";
  ctx.font = "13px KaiTi, 楷体, serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + 6, y + h + 12);
}

function drawQi(ctx, x, y, qi, color) {
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + i * 18, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = i < qi ? color : "rgba(255,255,255,0.15)";
    ctx.fill();
  }
}

// 空格键出招/格挡/小游戏时机判定
document.addEventListener("keydown", e => {
  if (e.code !== "Space") return;
  if (duel.active && (duel.phase === "qteAtk" || duel.phase === "qteDef")) { e.preventDefault(); duelPress(); }
  else if (craft.active && !craft.done) { e.preventDefault(); craftPress(); }
});

/* ============================================================
   八点九、Phase 3：辩才舌战（卡牌克制小游戏）
   三角克制：理📚 → 情❤ → 势⚡ → 理📚
   ============================================================ */
const CARD_TYPES = {
  li:   { id:"li",   name:"理", icon:"📚", color:"#3f6f8f", beats:"qing", tip:"理克情" },
  qing: { id:"qing", name:"情", icon:"❤",  color:"#a8322a", beats:"shi",  tip:"情克势" },
  shi:  { id:"shi",  name:"势", icon:"⚡",  color:"#c9a227", beats:"li",   tip:"势克理" },
};

const debate = {
  active:false, cv:null, ctx:null,
  p:null, e:null, deck:[], ph:[], eh:[],
  phase:"choose", msg:"", round:1,
  pc:null, ac:null,           // 本轮打出的牌
  onWin:null, onLose:null,
};

function startDebate(oppCfg, onWin, onLose) {
  const D = debate;
  D.cv = $("debate-canvas"); D.ctx = D.cv.getContext("2d");
  D.p = { name: G.name, wit: G.stats.wit, hpMax: 70 + G.stats.wit, hp: 70 + G.stats.wit };
  D.e = { name: oppCfg.name, wit: oppCfg.wit, hpMax: oppCfg.hp, hp: oppCfg.hp };
  D.onWin = onWin; D.onLose = onLose;
  D.deck = [];
  for (let i = 0; i < 24; i++) {
    const types = Object.keys(CARD_TYPES);
    D.deck.push({ t: types[rand(0, 2)], v: rand(1, 9) });
  }
  D.ph = []; D.eh = [];
  debateRefill(D.ph); debateRefill(D.eh);
  D.round = 1; D.phase = "choose";
  D.msg = `${oppCfg.name}抚须而笑：“阁下高见，愿闻其详。”`;
  $("debate-title").textContent = `舌战 · ${G.name} vs ${oppCfg.name}`;
  $("debate-modal").classList.remove("hidden");
  D.active = true;
  D.cv.onclick = e => debateClick(e);
  requestAnimationFrame(debateLoop);
}

function debateRefill(hand) {
  const D = debate;
  while (hand.length < 5 && D.deck.length > 0) hand.push(D.deck.pop());
}

function debateLoop(ts) {
  const D = debate;
  if (!D.active) return;
  D.t = ts / 1000;
  drawDebate();
  requestAnimationFrame(debateLoop);
}

function debateClick(e) {
  const D = debate;
  if (!D.active || D.phase !== "choose") return;
  const rect = D.cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 720;
  const y = (e.clientY - rect.top) / rect.height * 420;
  // 玩家手牌区域：y 310~410
  if (y < 310 || y > 415) return;
  const idx = Math.floor((x - 111) / 102);
  if (idx < 0 || idx >= D.ph.length) return;
  const pc = D.ph.splice(idx, 1)[0];

  // AI 选牌：55% 概率打出克制牌
  let ac;
  const counters = D.eh.filter(c => CARD_TYPES[c.t].beats === pc.t);
  if (counters.length && Math.random() < 0.55) {
    ac = counters[rand(0, counters.length - 1)];
    D.eh.splice(D.eh.indexOf(ac), 1);
  } else {
    ac = D.eh.splice(rand(0, D.eh.length - 1), 1)[0];
  }
  D.pc = pc; D.ac = ac;
  D.phase = "resolve";
  D.msg = `你打出「${CARD_TYPES[pc.t].name}${pc.v}」…对方亮出「${CARD_TYPES[ac.t].name}${ac.v}」！`;
  setTimeout(debateResolve, 1000);
}

function debateResolve() {
  const D = debate;
  if (!D.active) return;
  const pt = CARD_TYPES[D.pc.t], at = CARD_TYPES[D.ac.t];
  let winner = null;
  if (pt.beats === D.ac.t) winner = "p";
  else if (at.beats === D.pc.t) winner = "e";
  else if (D.pc.v !== D.ac.v) winner = D.pc.v > D.ac.v ? "p" : "e";

  let dmg = 0;
  if (winner === "p") {
    dmg = 10 + D.pc.v + Math.floor(D.p.wit / 15);
    D.e.hp -= dmg;
    D.msg = `${pt.name}压过${at.name}——雄辩滔滔，对方心神-${dmg}！`;
  } else if (winner === "e") {
    dmg = 10 + D.ac.v + Math.floor(D.e.wit / 15);
    D.p.hp -= dmg;
    D.msg = `${at.name}驳得${pt.name}哑口无言，你心神-${dmg}…`;
  } else {
    D.msg = "两番陈词针锋相对，一时僵持不下。";
  }
  D.round++;
  debateRefill(D.ph); debateRefill(D.eh);
  if (D.e.hp <= 0 || D.p.hp <= 0 || (D.deck.length === 0 && !D.ph.length && !D.eh.length)) {
    D.phase = "over";
    D.win = D.p.hp > D.e.hp && D.e.hp <= 0 ? true : D.p.hp >= D.e.hp;
    D.win = D.e.hp <= 0 ? true : (D.p.hp <= 0 ? false : D.p.hp >= D.e.hp);
    D.msg = D.win
      ? `<b class="log-good">对方长叹：“吾不如也！”</b>你舌战获胜！`
      : `<b class="log-bad">言辞屡屡受挫，甘拜下风。</b>`;
    drawDebate();
    const logEl = $("debate-log");
    logEl.innerHTML = D.msg;
    setTimeout(() => {
      $("debate-modal").classList.add("hidden");
      D.active = false;
      (D.win ? D.onWin : D.onLose) && (D.win ? D.onWin() : D.onLose());
    }, 1600);
  } else {
    D.phase = "choose";
    D.msg += " 请出牌。";
  }
}

function debateCardRect(i) {
  return { x: 111 + i * 102, y: 310, w: 90, h: 100 };
}

function drawDebate() {
  const D = debate, ctx = D.ctx;
  const W = 720, H = 420;
  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2c2a22"); g.addColorStop(1, "#1f1d17");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 心神条
  drawDuelBar(ctx, 40, 8, 280, 16, D.p.hp / D.p.hpMax, "#4e7a5a", `${D.p.name} 心神 ${Math.max(0, D.p.hp)}/${D.p.hpMax}`);
  drawDuelBar(ctx, 400, 8, 280, 16, D.e.hp / D.e.hpMax, "#a8322a", `${D.e.name} 心神 ${Math.max(0, D.e.hp)}/${D.e.hpMax}`);

  // 肖像
  ctx.font = "56px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🧑‍🌾", 180, 180 + Math.sin(D.t * 2) * 4);
  ctx.fillText("🧙", 540, 180 + Math.sin(D.t * 2 + 2) * 4);

  // 克制说明
  ctx.font = "13px KaiTi, 楷体, serif";
  ctx.fillStyle = "rgba(232,220,194,0.75)";
  ctx.fillText("理📚 克 情❤ 克 势⚡ 克 理📚　｜　同型比牌力　｜　点击下方你的牌出招", W / 2, 118);

  // 中央展示区：本轮双方出的牌
  if (D.phase === "resolve" || D.phase === "over") {
    if (D.pc) drawCard(ctx, 300, 165, D.pc, "我方");
    if (D.ac) drawCard(ctx, 350, 165, D.ac, "对方");
  }

  // 对方手牌（明牌）
  D.eh.forEach((c, i) => drawCard(ctx, 111 + i * 102, 25, c, ""));

  // 我方手牌
  if (D.phase === "choose" || D.phase === "resolve") {
    D.ph.forEach((c, i) => {
      const r = debateCardRect(i);
      drawCard(ctx, r.x, r.y, c, "");
    });
    if (D.phase === "choose") {
      ctx.fillStyle = "rgba(201,162,39,0.9)";
      ctx.font = "14px KaiTi, 楷体, serif";
      ctx.fillText(`▼ 点击你的牌（第 ${D.round} 回合）`, W / 2, 300);
    }
  }

  $("debate-log").innerHTML = D.msg;
}

function drawCard(ctx, x, y, card, owner) {
  const t = CARD_TYPES[card.t];
  ctx.save();
  ctx.fillStyle = "rgba(20,18,14,0.9)";
  ctx.strokeStyle = t.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, 90, 100, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = t.color;
  ctx.font = "34px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(t.icon, x + 45, y + 34);
  ctx.fillStyle = "#f0e6cd";
  ctx.font = "bold 26px KaiTi, 楷体, serif";
  ctx.fillText(t.name, x + 45, y + 66);
  ctx.font = "15px serif";
  ctx.fillText(String(card.v), x + 45, y + 88);
  if (owner) {
    ctx.fillStyle = "rgba(240,230,205,0.8)";
    ctx.font = "12px KaiTi, 楷体, serif";
    ctx.fillText(owner, x + 45, y - 10);
  }
  ctx.restore();
}

/* ============================================================
   八点十、Phase 4：武将社交系统（亲密度 / 送礼 / 切磋 / 招揽）
   ============================================================ */
function generalById(id) {
  return ((window.GAME_DATA || {}).GENERALS || []).find(g => g.id === id);
}
function favorOf(gid) { return G.favor[gid] || 0; }

function addFavor(g, n) {
  const before = favorOf(g.id);
  G.favor[g.id] = Math.min(100, before + n);
  if (before < 40 && G.favor[g.id] >= 40) {
    queueEvent({ title: `与${g.name}倾心相交`, text: g.story, options: [{ label: "谨记教诲", effect: "none" }] });
  }
  if (before < 80 && G.favor[g.id] >= 80 && !G.party.includes(g.id)) {
    log(`<span class="log-good">你与${g.name}已然莫逆——亲密度达 80，可以「招揽」了！</span>`);
  }
}

function openVisit() {
  renderVisit();
  $("visit-modal").classList.remove("hidden");
}

function renderVisit() {
  const here = nodeById(G.location);
  $("visit-title").textContent = `${here.name} · 名士录`;
  const list = $("visit-list");
  const generals = ((window.GAME_DATA || {}).GENERALS || []).filter(g => g.city === G.location);
  list.innerHTML = "";

  if (!generals.length) { list.innerHTML = `<p style="color:var(--text-light);font-size:14px;">此地并无知名武将，去大城访贤吧。</p>`; return; }

  generals.forEach(g => {
    const f = forceById(g.force);
    const s = g.stats;
    const fav = favorOf(g.id);
    const pct = Math.min(100, fav);
    const inParty = G.party.includes(g.id);
    const row = document.createElement("div");
    row.className = "visit-row";
    row.innerHTML = `
      <div class="g-name">${g.name}${inParty ? " ✔同行" : ""}<small>${f ? f.name + "麾下" : "在野"} · 统${s.leader} 武${s.force} 智${s.wit} 政${s.politics} 魅${s.charm}</small></div>
      <div class="g-desc">喜好：「${itemName(g.gift)}」</div>
      <div class="g-favor">亲密度 ${fav}/100
        <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
      </div>
      <div class="g-btns">
        <button class="btn" data-v="chat">寒暄</button>
        <button class="btn" data-v="tea">品茶(50贯)</button>
        <button class="btn" data-v="gift">送礼</button>
        <button class="btn" data-v="spar">切磋</button>
        <button class="btn" data-v="debate">舌战</button>
        ${!inParty && fav >= 80 ? `<button class="btn btn-primary" data-v="recruit">招揽</button>` : ""}
      </div>`;
    row.querySelector('[data-v="chat"]').onclick = () => visitChat(g);
    row.querySelector('[data-v="tea"]').onclick = () => visitTea(g);
    row.querySelector('[data-v="gift"]').onclick = () => visitGift(g);
    row.querySelector('[data-v="spar"]').onclick = () => visitSpar(g);
    row.querySelector('[data-v="debate"]').onclick = () => visitDebate(g);
    const rb = row.querySelector('[data-v="recruit"]');
    if (rb) rb.onclick = () => recruitGeneral(g);
    list.appendChild(row);
  });
}

function visitAfter() {
  advanceDay();
  updateHUD();
  autosave();
  renderVisit();
}

function visitChat(g) {
  const gain = G.stats.charm + rand(0, 40) >= 75 ? rand(2, 3) : 1;
  addFavor(g, gain);
  log(`与${g.name}谈天说地，相谈甚欢。亲密度+${gain}`);
  visitAfter();
}

function visitTea(g) {
  if (G.money < 50) { showToast("品茶需 50 贯！"); return; }
  G.money -= 50;
  // Phase 4+：茶道小游戏——手艺决定亲密度增益
  playTeaGame(`与${g.name}品茶`, avg => {
    G.skills.teaXp = (G.skills.teaXp || 0) + 1;
    let gain = Math.max(1, Math.round(avg / 25));
    let rank = avg >= 90 ? "此茶堪称神品" : avg >= 75 ? "茶香四溢" : avg >= 55 ? "尚可入口" : "略有苦涩";
    if (avg >= 85) { gain += 2; G.fame += 2; rank += `，${g.name}赞叹不已，传闻四方！`; }
    addFavor(g, gain);
    log(`与${g.name}茶肆一叙——${rank}。亲密度+${gain}${avg >= 85 ? "，名声上升" : ""}。`);
    visitAfter();
  });
}

function visitGift(g) {
  let itemId = null, gain = 0;
  if ((G.inventory[g.gift] || 0) > 0) { itemId = g.gift; gain = 10 + rand(0, 3); }
  else {
    const item = ((window.GAME_DATA || {}).ITEMS || []).find(i => (G.inventory[i.id] || 0) > 0);
    if (item) { itemId = item.id; gain = 4 + rand(0, 2); }
  }
  if (!itemId) { showToast("行囊中没有礼品——可在市集「名品·礼品」区购买。"); return; }
  G.inventory[itemId]--;
  addFavor(g, gain);
  log(`将「${itemName(itemId)}」赠予${g.name}——${itemId === g.gift ? `<span class="log-good">正合其心意，大喜过望！</span>` : "对方欣然收下。"}亲密度+${gain}`);
  visitAfter();
}

function visitSpar(g) {
  startDuel(
    { name: `${g.name}（切磋点到为止）`, force: g.stats.force, hp: 130 + Math.floor(g.stats.force / 2) },
    () => { addFavor(g, 5); G.fame += 2; log(`<span class="log-good">与${g.name}切磋获胜！对方抚掌大笑，亲密度+5，名声上升。</span>`); updateHUD(); renderVisit(); },
    () => { addFavor(g, 1); G.hp = Math.max(5, G.hp - 10); log(`切磋虽败，${g.name}指点了你几招，亲密度+1，体力-10。`); updateHUD(); renderVisit(); }
  );
}

function visitDebate(g) {
  startDebate(
    { name: g.name, wit: g.stats.wit, hp: 70 + g.stats.wit },
    () => { addFavor(g, 5); log(`<span class="log-good">舌战折服${g.name}！对方击节赞叹，亲密度+5。</span>`); updateHUD(); renderVisit(); },
    () => { addFavor(g, 1); log(`${g.name}辩才无碍，你甘拜下风，亲密度+1。`); updateHUD(); renderVisit(); }
  );
}

function recruitGeneral(g) {
  if (favorOf(g.id) < 80) { showToast("亲密度需达 80！"); return; }
  if (G.party.includes(g.id)) return;
  const best = Object.entries(g.stats).sort((a, b) => b[1] - a[1])[0][0];
  G.stats[best] += 2;
  G.party.push(g.id);
  G.fame += 5;
  const cn = { leader:"统率", force:"武力", wit:"智力", politics:"政治", charm:"魅力" }[best];
  queueEvent({
    title: `${g.name}来投`,
    text: `${g.name}整衣肃容，向你郑重一揖：“承蒙不弃，愿效犬马之劳！”\n你获得同伴「${g.name}」，${cn}+2（其所长潜移默化）。`,
    options: [{ label: "大喜，设宴相庆", effect: "none" }],
  });
  updateHUD();
  autosave();
  renderVisit();
}

/* ============================================================
   八点十一、Phase 4+：茶道 / 锻冶 时机判定小游戏引擎
   ============================================================ */
const craft = {
  active:false, cv:null, ctx:null, cfg:null,
  round:0, results:[], bar:{ pos:0.5, dir:1 },
  t:0, msg:"", done:false, lastHit:0,
};

function startCraft(cfg) {
  const C = craft;
  C.cfg = cfg; C.round = 0; C.results = [];
  C.bar.pos = 0.5; C.bar.dir = 1; C.done = false;
  C.msg = cfg.intro || "看准时机，点击画面或按空格！";
  C.cv = $("craft-canvas"); C.ctx = C.cv.getContext("2d");
  $("craft-title").textContent = cfg.title;
  $("craft-modal").classList.remove("hidden");
  $("craft-done").classList.add("hidden");
  C.active = true;
  C.cv.onclick = () => craftPress();
  requestAnimationFrame(craftLoop);
}

function craftPress() {
  const C = craft;
  if (!C.active || C.done) return;
  const off = Math.abs(C.bar.pos - 0.5), zh = C.cfg.zoneHalf;
  let score, word;
  if (off < zh * 0.4)      { score = 100; word = "神乎其技！"; }
  else if (off < zh)       { score = 70;  word = "手法娴熟。"; }
  else                     { score = 20;  word = "失了分寸…"; }
  C.results.push(score);
  C.msg = `第 ${C.round + 1} 步「${C.cfg.labels[C.round]}」：${word}`;
  C.lastHit = performance.now();
  C.round++;
  if (C.round >= C.cfg.rounds) craftFinish();
  else { C.bar.pos = 0.5; C.bar.dir = 1; }
}

function craftFinish() {
  const C = craft;
  C.done = true;
  const avg = Math.round(C.results.reduce((a, b) => a + b, 0) / C.results.length);
  const rank = avg >= 90 ? "神品" : avg >= 75 ? "妙品" : avg >= 55 ? "佳品" : "平庸";
  C.msg = `完成！总评 <b>${avg}</b> 分 —— ${rank}`;
  C.avg = avg;
  $("craft-done").classList.remove("hidden");
}

function craftLoop(ts) {
  const C = craft;
  if (!C.active) return;
  if (!C.done) {
    C.bar.pos += C.bar.dir * C.cfg.speed;
    if (C.bar.pos > 1) { C.bar.pos = 1; C.bar.dir = -1; }
    if (C.bar.pos < 0) { C.bar.pos = 0; C.bar.dir = 1; }
  }
  C.t = ts / 1000;
  drawCraft();
  requestAnimationFrame(craftLoop);
}

function drawCraft() {
  const C = craft, ctx = C.ctx, W = 720, H = 360;
  const tea = C.cfg.theme === "tea";
  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (tea) { g.addColorStop(0, "#463c2c"); g.addColorStop(1, "#2e2820"); }
  else     { g.addColorStop(0, "#38271c"); g.addColorStop(1, "#221812"); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 主题图案
  ctx.font = "64px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (tea) {
    ctx.fillText("🫖", 250, 140 + Math.sin(C.t * 2) * 4);
    ctx.font = "40px serif";
    ctx.fillText("🍵", 430, 150);
    ctx.font = "26px serif";
    ctx.fillText("♨", 480, 105 + Math.sin(C.t * 3) * 5);
  } else {
    ctx.fillText("⚒️", 250, 140 + Math.sin(C.t * 6) * (C.lastHit && performance.now() - C.lastHit < 250 ? 14 : 4));
    ctx.font = "36px serif";
    ctx.fillText("🔥", 430, 150);
    if (C.lastHit && performance.now() - C.lastHit < 300) {
      ctx.font = "30px serif"; ctx.fillText("✨💥", 470, 110);
    }
  }

  // 步骤指示
  ctx.fillStyle = "#e8dcc2";
  ctx.font = "18px KaiTi, 楷体, serif";
  ctx.fillText(C.done ? "—— 完成 ——" : `第 ${C.round + 1}/${C.cfg.rounds} 步：${C.cfg.labels[Math.min(C.round, C.cfg.rounds - 1)]}`, W / 2, 40);
  // 已完成步骤的小圆点
  C.results.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(310 + i * 26, 66, 8, 0, Math.PI * 2);
    ctx.fillStyle = r === 100 ? "#c9a227" : r === 70 ? "#4e7a5a" : "#7d241e";
    ctx.fill();
  });

  // 时机条
  if (!C.done) {
    const bx = 80, bw = 560, by = 260, bh = 30, zh = C.cfg.zoneHalf;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(78,122,90,0.55)";
    ctx.fillRect(bx + bw * (0.5 - zh), by, bw * zh * 2, bh);
    ctx.fillStyle = "rgba(201,162,39,0.85)";
    ctx.fillRect(bx + bw * (0.5 - zh * 0.4), by, bw * zh * 0.8, bh);
    ctx.fillStyle = "#fff";
    ctx.fillRect(bx + bw * C.bar.pos - 3, by - 4, 6, bh + 8);
    ctx.fillStyle = "#e8dcc2"; ctx.font = "13px KaiTi, 楷体, serif";
    ctx.fillText("点击画面 / 按空格", W / 2, by - 16);
  }

  $("craft-log").innerHTML = C.msg;
}

/* ---------- 茶道小游戏（品茶/结交名士用） ---------- */
function teaLevel() { return Math.min(5, Math.floor((G.skills.teaXp || 0) / 10)); }

function playTeaGame(title, onDone) {
  startCraft({
    title, theme: "tea", rounds: 4,
    labels: ["温杯", "投茶", "注水", "奉茶"],
    speed: 0.02,
    zoneHalf: Math.max(0.06, 0.13 - teaLevel() * 0.009),   // 茶道越熟，区间越窄但更从容
    intro: "以四道工序烹一壶好茶——看准时机出手！",
    onDone,
  });
}

/* ---------- 锻冶小游戏（铁匠铺用） ---------- */
function smithLevel() { return Math.min(5, Math.floor((G.skills.smithXp || 0) / 10)); }

function openSmith() {
  if (busy) return;
  if (nodeById(G.location).type !== "城") { showToast("打铁需在城中铁匠铺！"); return; }
  const hasTie = (G.inventory["tie"] || 0) > 0;
  startCraft({
    title: `铁匠铺 · 打铁${hasTie ? "（消耗铁器×1，成色更佳）" : ""}`,
    theme: "smith", rounds: 5,
    labels: ["起炉", "初锻", "折叠", "淬火", "开刃"],
    speed: 0.03,
    zoneHalf: Math.max(0.05, 0.095 - smithLevel() * 0.007),
    intro: "跟着火候锤击五次——节奏就是一切！",
    onDone: avg => {
      if (hasTie) G.inventory["tie"]--;
      G.skills.smithXp = (G.skills.smithXp || 0) + 1;
      const score = avg + (hasTie ? 10 : 0);
      const pay = Math.round(avg / 2) + rand(10, 30);
      G.money += pay;
      let extra = score >= 85 ? '<span class="log-good">炉火纯青！</span>'
        : score >= 60 ? "铁器成色不错。" : "手艺平平，还需磨练。";
      if (score >= 85 && !G.flags.mingdao) {
        G.flags.mingdao = true;
        G.stats.force += 2;
        G.inventory["mingdao"] = (G.inventory["mingdao"] || 0) + 1;
        extra = `<span class="log-good">名刀出世！获得「名刀」，武力+2！</span>`;
      }
      log(`铁匠铺一日帮工，工钱 ${pay} 贯。${extra}`);
      advanceDay();
      updateHUD();
      autosave();
    },
  });
}

/* ---------- 配药小游戏（医术）：组方 puzzle ---------- */
const HERB_POOLS = {
  ping:   [["甘草","平"],["茯苓","平"],["白术","平"],["大枣","平"]],
  heat:   [["肉桂","热"],["干姜","热"],["花椒","热"]],
  poison: [["附子","热",true],["乌头","热",true],["半夏","寒",true],["大黄","寒",true]],
  han:    [["黄连","寒"],["黄柏","寒"],["栀子","寒"]],
};
let herbState = null;

function medLevel() { return Math.min(5, Math.floor((G.skills.medXp || 0) / 10)); }

function craftMedicine() {
  if ((G.inventory["yao"] || 0) < 2) { showToast("药材不足 2 份！"); return; }
  G.inventory["yao"] -= 2;
  // 组方：2 热（其一可能有毒）、3 平、1 寒，打乱呈现
  const pool = [];
  const heat = [...HERB_POOLS.heat].sort(() => Math.random() - 0.5);
  pool.push(heat[0]);
  pool.push(Math.random() < 0.5 ? pick(HERB_POOLS.poison) : heat[1]);
  const ping = [...HERB_POOLS.ping].sort(() => Math.random() - 0.5);
  pool.push(...ping.slice(0, 3));
  pool.push(pick(HERB_POOLS.han));
  const herbs = pool.map(h => ({ name: h[0], xing: h[1], poison: !!h[2] })).sort(() => Math.random() - 0.5);
  herbState = { herbs, selected: new Set() };
  renderHerb();
  $("herb-modal").classList.remove("hidden");
}

function renderHerb() {
  const lvl = medLevel();
  $("herb-recipe").innerHTML =
    `【金创药方】需「热」性活血药×1 +「平」性调和药×2；忌「寒」性、忌毒草。<br>` +
    (lvl >= 2 ? `<span class="log-good">你医术精进，毒草一眼可辨（☠ 标记）。</span>` : `<span class="log-bad">小心——六味药材中暗藏毒性！</span>`);
  const grid = $("herb-grid");
  grid.innerHTML = "";
  herbState.herbs.forEach((h, i) => {
    const b = document.createElement("button");
    b.className = "herb-btn" + (herbState.selected.has(i) ? " selected" : "");
    b.innerHTML = `${h.name}${h.poison && lvl >= 2 ? ' <span class="poison-tag">☠有毒</span>' : ""}<small>药性：${h.xing}</small>`;
    b.onclick = () => {
      if (herbState.selected.has(i)) herbState.selected.delete(i);
      else if (herbState.selected.size < 3) herbState.selected.add(i);
      else { showToast("最多选三味药材"); return; }
      renderHerb();
    };
    grid.appendChild(b);
  });
  const names = [...herbState.selected].map(i => herbState.herbs[i].name).join("、") || "（未选）";
  $("herb-status").textContent = `已选 ${herbState.selected.size}/3 味：${names}`;
}

function herbConfirm() {
  if (!herbState || herbState.selected.size !== 3) { showToast("需选满三味药材！"); return; }
  const sel = [...herbState.selected].map(i => herbState.herbs[i]);
  const poison = sel.filter(h => h.poison).length;
  const heatNP = sel.filter(h => !h.poison && h.xing === "热").length;
  const pingNP = sel.filter(h => !h.poison && h.xing === "平").length;
  $("herb-modal").classList.add("hidden");

  if (poison > 0) {
    G.hp = Math.max(5, G.hp - 10);
    log(`<span class="log-bad">误用毒草「${sel.find(h => h.poison).name}」！丹炉炸裂，药材尽废，体力-10。</span>`);
  } else if (heatNP === 1 && pingNP === 2) {
    G.inventory["dan"] = (G.inventory["dan"] || 0) + 2;
    G.skills.medXp = (G.skills.medXp || 0) + 2;
    log(`<span class="log-good">君臣佐使，配伍精当！一炉炼出两瓶金创药（现存 ${G.inventory["dan"]}）。</span>`);
  } else {
    G.inventory["dan"] = (G.inventory["dan"] || 0) + 1;
    G.skills.medXp = (G.skills.medXp || 0) + 1;
    log(`药性略有偏差，勉强合成一瓶金创药（现存 ${G.inventory["dan"]}）。`);
  }
  herbState = null;
  advanceDay();
  updateHUD();
  autosave();
}

function herbCancel() {
  $("herb-modal").classList.add("hidden");
  herbState = null;
  log(`你搁下药杵，两份药材白白风干了…`);
  advanceDay();
  updateHUD();
  autosave();
}

/* ============================================================
   八点十二、酒肆 · 德州扑克挂载（调用 poker.js 的 TexasHoldemGame）
   ============================================================ */
function openTavern() {
  if (busy) return;
  if (nodeById(G.location).type !== "城") { showToast("酒肆开在城里！"); return; }
  const gs = ((window.GAME_DATA || {}).GENERALS || []).filter(g => g.city === G.location);
  if (!gs.length) { showToast("酒肆里没有熟面孔，去大城碰碰运气吧。"); return; }
  const g = pick(gs);
  const stake = 150 + rand(0, 150);
  if (!confirm(`酒肆偶遇「${g.name}」。酒过三巡，对方拍案而起：\n\n“不妨赌上一把，每人 ${stake} 贯为注——敢不敢来？”\n\n（对方性格：${g.stats.wit >= 88 ? "智谋深沉" : g.stats.force >= 92 ? "莽撞冲动" : g.stats.charm <= 40 ? "贪婪成性" : "喜怒不形于色"}）`)) return;
  startPokerWith(g, stake);
}

function startPokerWith(g, stake) {
  // 亲密度在整场牌局结束后一次性结算，避免剧情弹窗被牌局界面遮挡
  let favDelta = 0;
  window.TexasHoldemGame.startGame({
    opponent: { id: g.id, name: g.name, wit: g.stats.wit, force: g.stats.force, charm: g.stats.charm, stake },
    player: { name: G.name, identity: G.identity, wit: G.stats.wit },
    hooks: {
      playerMoney: () => G.money,
      bet: n => { G.money -= n; autosave(); },
      collect: n => { G.money += n; autosave(); },
      onHandResult: won => { favDelta += won ? 8 : -5; },
      onOpponentBroke: () => pokerEgg(g),
      onEnd: () => {
        if (favDelta !== 0) {
          addFavor(g, favDelta);
          log(favDelta > 0
            ? `<span class="log-good">赌桌之上连番获胜，${g.name}对你愈发欣赏，亲密度+${favDelta}。</span>`
            : `<span class="log-bad">牌桌上屡屡失手，${g.name}对你有些轻视了，亲密度${favDelta}。</span>`);
        }
        updateHUD();
        autosave();
      },
    },
  });
  updateHUD();
}

function pokerEgg(g) {
  if (g.stats.wit >= 90) {
    G.stats.wit += 2;
    G.fame += 5;
    queueEvent({
      title: `${g.name}心服口服`,
      text: `${g.name}推枰长叹：“算无遗策，吾不如也。愿以平生所学相授。”\n——你获得「拜师」机缘：智力+2，名声+5。`,
      options: [{ label: "执弟子礼", effect: "none" }],
    });
  } else {
    const treasure = pick(["moujian", "bingfa", "yupei", "guqin"]);
    G.inventory[treasure] = (G.inventory[treasure] || 0) + 1;
    queueEvent({
      title: `${g.name}输了个精光`,
      text: `${g.name}囊中空空，咬牙解下随身之宝抵账——你获得「${itemName(treasure)}」！`,
      options: [{ label: "笑纳", effect: "none" }],
    });
  }
  log(`<b class="log-event">彩蛋达成</b>：赢光了${g.name}的全部赌资！`);
  updateHUD();
  autosave();
}

/* ============================================================
   八点十三、合战挂载（调用 battle.js 的 BattleGame）
   ============================================================ */
function startCampaign() {
  if (busy) return;
  const enemies = FORCES.filter(f => f.id !== G.serve);
  const ef = pick(enemies);
  const gens = ((window.GAME_DATA || {}).GENERALS || []).filter(g => g.force === ef.id);
  const eg = gens.length
    ? pick(gens)
    : { name: `${ef.name}军·副将`, stats: { force: 75, wit: 60, charm: 50 } };
  if (!confirm(`你向主公请战，兵锋直指「${ef.name}军」！\n\n敌方主将：${eg.name}（武力 ${eg.stats.force}）\n我方士气：${Math.min(90, 50 + Math.floor(G.stats.leader / 5))}（受统率加成）\n\n兵种克制：枪🔱克骑🐎克弓🏹克枪 | 山林利弓、河流阻骑\n\n出征消耗 1 天，开战？`)) return;

  window.BattleGame.startGame({
    playerName: G.name,
    stats: { leader: G.stats.leader, force: G.stats.force },
    enemy: { name: eg.name, force: eg.stats.force },
    hooks: {
      onEnd: ({ win, fled }) => {
        advanceDay();
        if (win) {
          const merit = 30, pay = 150;
          if (G.serve) G.merit += merit;
          G.money += pay;
          G.fame += 8;
          log(`<span class="log-good">合战大捷！击破${ef.name}军（主将 ${eg.name}）。${G.serve ? `功绩+${merit}，` : ""}缴获 ${pay} 贯，名声+8。</span>`);
          const before = rankOfMerit(G.merit - merit).name, after = rankOfMerit(G.merit).name;
          if (G.serve && before !== after) log(`<b class="log-good">军功赫赫，晋升「${after}」！</b>`);
        } else if (fled) {
          G.hp = Math.max(5, G.hp - 10);
          log(`<span class="log-bad">你鸣金收兵，保存了实力（体力-10）。</span>`);
        } else {
          G.hp = Math.max(5, G.hp - 20);
          if (G.serve) G.merit += 2;
          log(`<span class="log-bad">合战失利，损兵折将（体力-20${G.serve ? "，功绩+2" : ""}）。</span>`);
        }
        updateHUD();
        autosave();
        if (!$("identity-modal").classList.contains("hidden")) renderIdentityPanel();
      },
    },
  });
  updateHUD();
}

/* ============================================================
   十、Canvas 渲染循环（水墨大地图）
   ============================================================ */
function resizeCanvas() {
  // 保持内部逻辑分辨率 1000x700，CSS 自动缩放
  const ratio = 700 / 1000;
  const w = canvas.parentElement.clientWidth;
  canvas.style.height = (w * ratio) + "px";
}

function draw(timestamp) {
  if (!G) { requestAnimationFrame(draw); return; }

  // 玩家标记平滑插值
  const p = nodeById(G.location);
  playerRender.x += (p.x - playerRender.x) * 0.12;
  playerRender.y += (p.y - playerRender.y) * 0.12;

  ctx.clearRect(0, 0, viewW, viewH);

  // --- 背景：宣纸质感 ---
  drawPaperBackground();

  // --- 山川装饰 ---
  drawMountains();

  // --- 道路 ---
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(107,95,78,0.55)";
  ctx.setLineDash([7, 6]);
  EDGES.forEach(([a, b]) => {
    const na = nodeById(a), nb = nodeById(b);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // --- 节点 ---
  const adj = ADJ[G.location];
  NODES.forEach(n => {
    const isHere = n.id === G.location;
    const isAdj = adj.includes(n.id);
    drawNode(n, isHere, isAdj);
  });

  // --- 玩家标记 ---
  drawPlayerMarker();

  // --- 季节粒子 ---
  updateSeasonParticles();
  drawSeasonParticles();

  // --- 季节色调滤镜 ---
  drawSeasonTint();

  requestAnimationFrame(draw);
}

function drawPaperBackground() {
  const g = ctx.createLinearGradient(0, 0, viewW, viewH);
  g.addColorStop(0, "#efe6d3");
  g.addColorStop(0.5, "#e7dcc4");
  g.addColorStop(1, "#ddd1b6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // 纸张噪点
  ctx.fillStyle = "rgba(163,131,84,0.05)";
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(Math.random() * viewW, Math.random() * viewH, 2, 2);
  }
}

function drawMountains() {
  ctx.save();
  ctx.fillStyle = "rgba(107,125,106,0.18)";
  // 几组简笔山形
  const ranges = [
    [[80,220],[150,140],[220,230]],
    [[250,560],[310,480],[370,570]],
    [[560,650],[620,580],[680,660]],
    [[740,200],[800,120],[860,210]],
    [[820,480],[880,400],[940,490]],
  ];
  ranges.forEach(([a, b, c]) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.closePath();
    ctx.fill();
    // 山顶皴笔
    ctx.strokeStyle = "rgba(80,95,78,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - 12, b[1] + 30);
    ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + 14, b[1] + 26);
    ctx.stroke();
  });
  // 一条"大江"
  ctx.strokeStyle = "rgba(90,120,140,0.28)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(430, 700);
  ctx.bezierCurveTo(500, 620, 600, 600, 1000, 560);
  ctx.stroke();
  ctx.restore();
}

const NODE_ICON = { "城":"🏛", "港":"⚓", "村":"🍃", "山林":"⛰", "道场":"⛩" };
const NODE_COLOR = { "城":"#a8322a", "港":"#3f6f8f", "村":"#6b8e58", "山林":"#5c5344", "道场":"#8a6d3b" };

function drawNode(n, isHere, isAdj) {
  const r = 16;
  ctx.save();

  // 可点击的相邻节点：呼吸高亮
  if (isAdj) {
    const pulse = 22 + Math.sin(Date.now() / 300 + n.x) * 4;
    ctx.strokeStyle = "rgba(201,162,39,0.8)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(n.x, n.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 节点主体
  ctx.fillStyle = NODE_COLOR[n.type] || "#555";
  ctx.strokeStyle = isHere ? "#c9a227" : "#2b2620";
  ctx.lineWidth = isHere ? 3 : 1.5;
  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 图标
  ctx.font = "15px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f4ecdb";
  ctx.fillText(NODE_ICON[n.type] || "·", n.x, n.y + 1);

  // 名称
  ctx.font = (isHere ? "bold " : "") + "15px KaiTi, 楷体, serif";
  ctx.fillStyle = isHere ? "#a8322a" : "#2b2620";
  ctx.strokeStyle = "rgba(236,227,208,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText(n.name, n.x, n.y + 30);
  ctx.fillText(n.name, n.x, n.y + 30);

  // 所在标记
  if (isHere) {
    ctx.fillStyle = "#c9a227";
    ctx.font = "13px serif";
    ctx.fillText("▼ 你在此", n.x, n.y - 26);
  }

  // 悬停提示（含 Phase 4 城池数据）
  if (selectedNode === n.id) {
    const gd = window.GAME_DATA || {};
    const ci = (gd.CITY_INFO || {})[n.id];
    const text = ci ? `${n.desc}（${ci.ruler}治下 · 人口${ci.pop}）` : n.desc;
    ctx.fillStyle = "rgba(43,38,32,0.88)";
    const tw = ctx.measureText(text).width + 20;
    const tx = Math.min(n.x - tw / 2, viewW - tw - 8);
    ctx.fillRect(tx, n.y - 62, tw, 24);
    ctx.fillStyle = "#f0e6cd";
    ctx.font = "13px KaiTi, 楷体, serif";
    ctx.fillText(text, tx + 10, n.y - 50);
  }
  ctx.restore();
}

function drawPlayerMarker() {
  ctx.save();
  ctx.shadowColor = "rgba(168,50,42,0.6)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#a8322a";
  ctx.beginPath();
  ctx.arc(playerRender.x, playerRender.y - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = "20px serif";
  ctx.textAlign = "center";
  ctx.fillText("🏹", playerRender.x, playerRender.y + 14);
}

/* --- 季节粒子 --- */
function updateSeasonParticles() {
  const season = seasonOf(G.date.m);
  const target = season === "冬" ? 40 : season === "秋" ? 25 : season === "春" ? 15 : 0;
  while (particles.length < target) {
    particles.push({ x: Math.random() * viewW, y: Math.random() * viewH, s: Math.random() * 3 + 1, v: Math.random() + 0.4, d: Math.random() * 2 });
  }
  if (particles.length > target) particles.length = target;
  particles.forEach(p => {
    p.y += p.v * 1.5;
    p.x += Math.sin(Date.now() / 800 + p.d) * 0.6;
    if (p.y > viewH) { p.y = -5; p.x = Math.random() * viewW; }
  });
}

function drawSeasonParticles() {
  const season = seasonOf(G.date.m);
  particles.forEach(p => {
    if (season === "冬") { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
    else if (season === "秋") { ctx.fillStyle = "rgba(190,110,40,0.55)"; ctx.fillRect(p.x, p.y, p.s * 2.2, p.s); }
    else if (season === "春") { ctx.fillStyle = "rgba(220,235,200,0.8)"; ctx.fillRect(p.x, p.y, p.s, p.s); }
  });
}

function drawSeasonTint() {
  const tints = {
    春: "rgba(120,180,90,0.06)",
    夏: "rgba(60,140,90,0.08)",
    秋: "rgba(200,130,40,0.09)",
    冬: "rgba(120,160,200,0.10)",
  };
  ctx.fillStyle = tints[seasonOf(G.date.m)];
  ctx.fillRect(0, 0, viewW, viewH);
}

/* --- 地图点击 / 悬停 --- */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x: cx / rect.width * viewW, y: cy / rect.height * viewH };
}

function nodeAt(pt) {
  let best = null, bestD = 26;
  NODES.forEach(n => {
    const d = Math.hypot(n.x - pt.x, n.y - pt.y);
    if (d < bestD) { best = n; bestD = d; }
  });
  return best;
}

canvas.addEventListener("mousemove", e => {
  if (!G) return;
  const n = nodeAt(canvasPoint(e));
  selectedNode = n ? n.id : null;
});

canvas.addEventListener("click", async e => {
  if (!G || busy) return;
  const n = nodeAt(canvasPoint(e));
  if (!n) return;
  if (n.id === G.location) { showToast("你已在此地。"); return; }
  if (!ADJ[G.location].includes(n.id)) { showToast("距离太远，请先移动到相邻节点。"); return; }
  await travelTo(n.id);
});

window.addEventListener("resize", resizeCanvas);

/* ============================================================
   十一、界面初始化与流程控制
   ============================================================ */
function startNewGame() {
  const name = $("input-name").value.trim() || "无名侠客";
  const identity = $("input-identity").value;
  G = newState(name, identity);
  enterGame();
  log(`<b>建安前夜，中平元年。</b>${name}以「${identity}」之身踏入乱世，自洛阳始。
  （提示：黄巾之乱即将爆发，且看天下风云！）`);
  updateHUD();
  autosave();
}

function continueGame() {
  const save = loadSave();
  if (!save) { showToast("未找到存档"); return; }
  G = save;
  // 简易版本兼容：缺失字段补默认值
  G.seenEvents = G.seenEvents || [];
  G.skills = Object.assign({ businessXp: 0, teaXp: 0, medXp: 0, smithXp: 0 }, G.skills || {});
  if (Array.isArray(G.inventory)) G.inventory = {};   // Phase 1 存档迁移
  G.serve = G.serve || null;
  G.merit = G.merit || 0;
  G.quest = G.quest || null;
  G.market = G.market || null;
  G.sect = G.sect || null;
  G.disciples = G.disciples || 0;
  G.shop = G.shop || null;
  G.shopAcc = G.shopAcc || 0;
  G.favor = G.favor || {};
  G.party = G.party || [];
  G.flags = G.flags || {};
  playerRender = { x: nodeById(G.location).x, y: nodeById(G.location).y };
  enterGame();
  log(`<b>读取存档成功</b>，乱世之旅，继续前行。`);
  updateHUD();
}

function enterGame() {
  $("title-screen").classList.add("hidden");
  $("game-root").classList.remove("hidden");
  $("log-panel").innerHTML = "";
  particles = [];
  playerRender = { x: nodeById(G.location).x, y: nodeById(G.location).y };
  resizeCanvas();
}

function backToTitle() {
  if (!confirm("返回主菜单？（当前进度已自动存档）")) return;
  autosave();
  $("game-root").classList.add("hidden");
  $("title-screen").classList.remove("hidden");
  $("btn-continue").disabled = !loadSave();
}

/* --- 事件绑定 --- */
$("btn-new-game").onclick = startNewGame;
$("btn-continue").onclick = continueGame;
$("btn-save").onclick = () => showToast(autosave() ? "存档成功！" : "存档失败");
$("btn-back-title").onclick = backToTitle;
$("btn-identity").onclick = () => { if (G) openIdentityPanel(); };
$("trade-close").onclick = () => $("trade-modal").classList.add("hidden");
$("identity-close").onclick = () => $("identity-modal").classList.add("hidden");
// Phase 3：单挑行动按钮绑定（含战斗结束后的重建）
rebuildDuelButtons();
$("input-identity").onchange = e => {
  const id = e.target.value;
  $("identity-tip").textContent = IDENTITIES[id].desc + "（Phase 2 开放专属面板）";
};
document.querySelectorAll("#action-buttons .btn").forEach(btn => {
  btn.onclick = () => {
    const key = btn.dataset.action;
    if (key === "visit") { if (G && !busy) openVisit(); }
    else if (key === "smith") { if (G && !busy) openSmith(); }
    else if (key === "tavern") { if (G && !busy) openTavern(); }
    else doAction(key);
  };
});
$("visit-close").onclick = () => $("visit-modal").classList.add("hidden");
$("herb-confirm").onclick = herbConfirm;
$("herb-cancel").onclick = herbCancel;
$("craft-done").onclick = () => {
  $("craft-modal").classList.add("hidden");
  craft.active = false;
  const cb = craft.cfg && craft.cfg.onDone;
  craft.cfg.onDone = null;
  cb && cb(craft.avg);
};

// 初始：根据是否有存档禁用"继续"按钮
$("btn-continue").disabled = !loadSave();
resizeCanvas();
requestAnimationFrame(draw);
