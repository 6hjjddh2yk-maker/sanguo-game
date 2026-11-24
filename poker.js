/* =====================================================================
   三国立志传 · 酒肆小游戏：德州扑克 (TexasHoldemGame)
   - 标准牌型判定 evaluateHand(5~7 张)
   - 流程：底牌 → 翻牌圈 → 转牌圈 → 河牌圈 → 比牌
   - 下注：弃牌 / 跟注 / 加注 / 全押
   - AI 性格化：智者(高智力) / 莽撞(高武力) / 贪婪(董卓类) / 平衡
   - 彩蛋：赢光对手 → 拜师 / 宝物（由 hooks 回调交给主游戏处理）
   封装：仅暴露 window.TexasHoldemGame 与 window.PokerEval，不污染全局
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- 基础工具 ---------------- */
  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANK_TXT = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const HAND_NAMES = ["高牌", "一对", "两对", "三条", "顺子", "同花", "葫芦", "四条", "同花顺"];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function newDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  /* ---------------- 牌型判定 ---------------- */
  // 5 张 → [类别, 决胜牌...]，长度恒为 6，可直接逐位比较
  function evaluate5(cs) {
    const vs = cs.map(c => c.r).sort((a, b) => b - a);
    const flush = cs.every(c => c.s === cs[0].s);
    const cnt = {};
    vs.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    // 组按 (张数多优先, 点数大优先) 排序
    const groups = Object.keys(cnt).map(Number)
      .sort((a, b) => cnt[b] - cnt[a] || b - a);

    // 顺子（含 A-2-3-4-5 轮子）
    let sh = 0;
    const u = [...new Set(vs)];
    if (u.length === 5) {
      if (u[0] - u[4] === 4) sh = u[0];
      else if (u[0] === 14 && u[1] === 5 && u[4] === 2) sh = 5;
    }

    const pad = arr => { const r = arr.slice(0, 5); while (r.length < 5) r.push(0); return r; };

    if (flush && sh) return [8, sh, 0, 0, 0, 0];                 // 同花顺
    if (groups.length === 2) {
      if (cnt[groups[0]] === 4) return [7, groups[0], groups[1], 0, 0, 0]; // 四条
      return [6, groups[0], groups[1], 0, 0, 0];                // 葫芦
    }
    if (flush) return [5, ...pad(vs)];                          // 同花
    if (sh) return [4, sh, 0, 0, 0, 0];                         // 顺子
    if (groups.length === 3) {
      if (cnt[groups[0]] === 3) return [3, groups[0], groups[1], groups[2], 0, 0]; // 三条
      return [2, groups[0], groups[1], groups[2], 0, 0];        // 两对
    }
    if (groups.length === 4) return [1, groups[0], groups[1], groups[2], groups[3], 0]; // 一对
    return [0, ...pad(vs)];                                     // 高牌
  }

  // 5~7 张 → 最大的 5 张牌型（逐位比较的大小数组）
  function evaluateHand(cards) {
    if (cards.length === 5) return evaluate5(cards);
    let best = null;
    const n = cards.length;
    const rec = (start, chosen) => {
      if (chosen.length === 5) {
        const r = evaluate5(chosen);
        if (!best || cmpRank(r, best) > 0) best = r;
        return;
      }
      for (let i = start; i < n; i++) rec(i + 1, chosen.concat(cards[i]));
    };
    rec(0, []);
    return best;
  }

  function cmpRank(a, b) {
    for (let i = 0; i < 6; i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
  }

  /* ---------------- AI 台词库 ---------------- */
  const LINES = {
    sage: {
      check: "“且慢，让我算算……嗯。”", call: "“跟。”",
      raise: "“这一手，胜算在我。”", allin: "“胜负已分——全押。”",
      fold: "“此局让与君。”", win: "“算无遗策，承让。”", lose: "“佩服，佩服。”",
    },
    reckless: {
      check: "“磨磨蹭蹭干什么！”", call: "“跟！”",
      raise: "“哈哈哈，加倍！”", allin: "“全押！怕了吗！”",
      fold: "“呸！不玩了！”", win: "“痛快！！”", lose: "“再来再来！”",
    },
    greedy: {
      check: "“让我看看还能捞多少。”", call: "“哼，这点钱？跟！”",
      raise: "“加注！今日要大赚一笔。”", allin: "“孤注一掷！”",
      fold: "“停手……见好就收。”", win: "“哈哈哈，都是我的！”", lose: "“岂有此理……”",
    },
    balanced: {
      check: "“看来运气在我这边。”", call: "“跟。”",
      raise: "“加注又何妨。”", allin: "“舍命陪君子！”",
      fold: "“此局不宜恋战。”", win: "“承让承让。”", lose: "“技不如人。”",
    },
  };

  /* ---------------- 主类 ---------------- */
  const ANTE = 20, RAISE = 50;

  class TexasHoldemGame {
    constructor(cfg) {
      this.cfg = cfg;
      this.op = {
        name: cfg.opponent.name, wit: cfg.opponent.wit,
        force: cfg.opponent.force, charm: cfg.opponent.charm,
        stack: cfg.opponent.stake, stake: cfg.opponent.stake,
        lost: 0, wonChips: 0,
      };
      this.hooks = cfg.hooks;
      this.persona = this.personaOf(cfg.opponent);
      this.pot = 0; this.over = false; this.betweenHands = true;
      this.hole = []; this.oppHole = []; this.community = [];
      this.revealOpp = false; this.xrayUsed = false;
      this.xrayAvail = ["间谍", "商人"].includes(cfg.player.identity) && cfg.player.wit >= 80;
      this.msg = "洗牌中……";
      this._bind();
      this.el.avatar.textContent = this.avatarOf(cfg.opponent);
      this.el.title.textContent = `酒肆 · 德州扑克 —— 对手：${this.op.name}（${this.personaName()}）`;
    }

    /* ---------- 静态入口 ---------- */
    static startGame(cfg) { const g = new TexasHoldemGame(cfg); g.run(); return g; }

    personaOf(op) {
      if (op.wit >= 88) return "sage";
      if (op.force >= 92 && op.wit < 70) return "reckless";
      if (op.charm <= 40 || /董卓|吕布/.test(op.name)) return op.force >= 92 ? "reckless" : "greedy";
      return "balanced";
    }
    personaName() {
      return { sage: "智谋深沉", reckless: "莽撞冲动", greedy: "贪婪成性", balanced: "喜怒不形" }[this.persona];
    }
    avatarOf(op) {
      if (/貂蝉|大乔|小乔/.test(op.name)) return "🌸";
      if (op.wit >= 88) return "🧙";
      if (op.force >= 90) return "🪓";
      return "🎖";
    }
    bluffProb() {
      const p = { sage: 0.05, balanced: 0.15, greedy: 0.2, reckless: 0.3 }[this.persona];
      if (this.persona === "greedy" && this.op.lost > this.op.stake * 0.4) return 0.35; // 上头
      return p;
    }

    /* ---------- DOM ---------- */
    _bind() {
      this.el = {
        title: document.getElementById("pk-title"),
        oppName: document.getElementById("pk-opp-name"),
        oppMoney: document.getElementById("pk-opp-money"),
        oppCards: document.getElementById("pk-opp-cards"),
        bubble: document.getElementById("pk-bubble"),
        community: document.getElementById("pk-community"),
        pot: document.getElementById("pk-pot"),
        myCards: document.getElementById("pk-player-cards"),
        meName: document.getElementById("pk-me-name"),
        meMoney: document.getElementById("pk-me-money"),
        msg: document.getElementById("pk-msg"),
        actions: document.getElementById("pk-actions"),
        avatar: document.getElementById("pk-opp-avatar"),
      };
      this.el.meName.textContent = this.cfg.player.name;
      this.el.oppName.textContent = this.op.name;
      document.getElementById("pk-modal").classList.remove("hidden");
      document.querySelectorAll("#pk-actions .btn[data-p]").forEach(b => {
        b.onclick = () => this._onBtn(b.dataset.p);
      });
      document.getElementById("pk-xray").onclick = () => this._xray();
      document.getElementById("pk-quit").onclick = () => this._quit();
    }

    cardHTML(c, hidden) {
      if (hidden) return `<div class="pk-card back"><span>🀄</span></div>`;
      const red = c.s === 1 || c.s === 3;
      return `<div class="pk-card ${red ? "red" : ""}"><b>${RANK_TXT[c.r] || c.r}</b><i>${SUITS[c.s]}</i></div>`;
    }

    bubble(text) {
      const b = this.el.bubble;
      b.textContent = this.op.name + "：" + text;
      b.classList.remove("hidden");
      clearTimeout(this._bt);
      this._bt = setTimeout(() => b.classList.add("hidden"), 2600);
    }

    handName(cards) {
      const r = evaluateHand(cards);
      return HAND_NAMES[r[0]];
    }

    render() {
      const pm = this.hooks.playerMoney();
      this.el.oppMoney.textContent = `💰 ${this.op.stack} 贯`;
      this.el.meMoney.textContent = `💰 ${pm} 贯`;
      this.el.pot.textContent = `底池：${this.pot} 贯`;
      this.el.oppCards.innerHTML =
        this.oppHole.length ? this.oppHole.map(c => this.cardHTML(c, !this.revealOpp)).join("") : "";
      this.el.myCards.innerHTML = this.hole.map(c => this.cardHTML(c, false)).join("");
      this.el.community.innerHTML = this.community.map(c => this.cardHTML(c, false)).join("");
      this.el.msg.innerHTML = this.msg;
      // 按钮状态
      const inHand = !this.over && !this.betweenHands && !!this._resolve;
      const need = this.currentBet - this.pBets;
      const pm2 = this.hooks.playerMoney();
      const set = (id, on) => { document.querySelector(`#pk-actions [data-p="${id}"]`).disabled = !on; };
      set("fold", inHand);
      set("call", inHand);
      set("raise", inHand && pm2 >= need + RAISE && !this.aAllin);
      set("allin", inHand && pm2 > 0);
      document.getElementById("pk-xray").disabled = !inHand || this.xrayUsed || !this.xrayAvail;
      document.getElementById("pk-quit").disabled = !this.betweenHands || this.over && false;
      document.getElementById("pk-quit").disabled = this.over ? true : !this.betweenHands;
      // 跟注按钮文字
      const callBtn = document.querySelector('#pk-actions [data-p="call"]');
      callBtn.innerHTML = need > 0 ? `跟注 ${Math.min(need, pm2)}` : "过牌";
    }

    /* ---------- 牌力评估 ---------- */
    strength() {
      if (this.community.length < 3) {
        const [a, b] = [...this.oppHole].sort((x, y) => y.r - x.r);
        if (a.r === b.r) return Math.min(0.97, 0.5 + a.r / 30);
        let s = 0.16 + (a.r + b.r) / 62;
        if (a.s === b.s) s += 0.05;
        if (Math.abs(a.r - b.r) === 1) s += 0.04;
        return s;
      }
      const rank = evaluateHand([...this.oppHole, ...this.community]);
      const base = { 8: 1.0, 7: 0.97, 6: 0.93, 5: 0.86, 4: 0.8, 3: 0.68, 2: 0.58, 1: 0.44, 0: 0.2 };
      return Math.min(0.99, base[rank[0]] + (rank[1] / 14) * 0.06);
    }

    /* ---------- 流程 ---------- */
    async run() {
      this.render();
      while (!this.over) {
        await this.playHand();
        if (this.over) break;
        this.betweenHands = true;
        this.render();
        await sleep(1700);
        this.betweenHands = false;
        if (this.quitFlag) break;
      }
    }

    async playHand() {
      const ante = ANTE;
      if (this.hooks.playerMoney() < ante) { this.finish("你囊中羞涩，凑不齐底注，被掌柜的客客气气请出了酒肆……"); return; }
      if (this.op.stack < ante) { this.hooks.onOpponentBroke(); this.finish(`${this.op.name}已输了个精光！`); return; }

      this.hooks.bet(ante); this.op.stack -= ante;
      this.pot = ante * 2;
      this.deck = newDeck();
      this.hole = []; this.oppHole = []; this.community = [];
      this.pAllin = false; this.aAllin = false; this.revealOpp = false;
      this.currentBet = 0; this.pBets = 0; this.aBets = 0;
      this.msg = "发牌中……";
      this.render();
      await sleep(400);

      this.hole = [this.deck.pop(), this.deck.pop()];
      this.oppHole = [this.deck.pop(), this.deck.pop()];
      await this.dealAnim(this.el.myCards);
      this.msg = `你的底牌：${this.handName(this.hole)} 面底牌`;
      this.render();
      await sleep(600);

      const streets = [["翻牌圈", 3], ["转牌圈", 1], ["河牌圈", 1]];
      let runout = false;
      for (const [label, n] of streets) {
        await this.dealCommunity(n, label);
        const res = await this.bettingRound(label);
        if (res === "fold_p") { await this.aiWinByFold(); return; }
        if (res === "fold_a") { await this.aiLoseByFold(); return; }
        if (res === "runout") { runout = true; break; }
      }
      await this.showdown();
    }

    async dealAnim(container) {
      container.querySelectorAll(".pk-card").forEach((el, i) => {
        el.classList.add("deal");
        el.style.animationDelay = (i * 0.12) + "s";
      });
      await sleep(500);
    }

    async dealCommunity(n, label) {
      for (let i = 0; i < n; i++) {
        this.community.push(this.deck.pop());
        this.render();
        await this.dealAnim(this.el.community);
        await sleep(120);
      }
      const myBest = this.community.length >= 5
        ? HAND_NAMES[evaluateHand([...this.hole, ...this.community])[0]]
        : "（牌面未齐）";
      this.msg = `${label}——你当前最大牌型：<b>${myBest}</b>`;
      this.render();
      await sleep(500);
    }

    async bettingRound(label) {
      this.currentBet = 0; this.pBets = 0; this.aBets = 0;
      let turn = Math.random() < 0.5 ? "p" : "a";
      this.msg = `${label}——${turn === "p" ? "请你行动" : this.op.name + "思考中……"}`;
      this.render();

      while (true) {
        const act = turn === "p" ? await this.playerAct() : await this.aiAct();
        const bets = () => (turn === "p" ? this.pBets : this.aBets);

        if (act.t === "fold") {
          this.bubble(LINES[this.persona].fold);
          return turn === "p" ? "fold_p" : "fold_a";
        }
        if (act.t === "call") {
          const need = this.currentBet - bets();
          this.applyBet(turn, need);
          this.bubble(need > 0 ? LINES[this.persona].call : LINES[this.persona].check);
          await sleep(500);
          const meAllin = turn === "p" ? this.pAllin : this.aAllin;
          if (meAllin) return "runout";
          if (this.pBets === this.aBets) return (this.pAllin || this.aAllin) ? "runout" : "next";
          turn = turn === "p" ? "a" : "p";
          continue;
        }
        if (act.t === "raise" || act.t === "allin") {
          const target = act.t === "allin" ? Infinity : this.currentBet + RAISE;
          this.applyBet(turn, target - bets());
          const isAllin = turn === "p" ? this.pAllin : this.aAllin;
          this.bubble(isAllin ? LINES[this.persona].allin : LINES[this.persona].raise);
          await sleep(600);
          if (isAllin) { turn = turn === "p" ? "a" : "p"; this.msg = "有人全押！对方必须做出回应……"; this.render(); continue; }
          turn = turn === "p" ? "a" : "p";
          this.msg = `${this.op.name === "" ? "" : ""}下注加码，请应对。`;
          this.render();
          continue;
        }
      }
    }

    applyBet(side, amt) {
      if (side === "p") {
        const pay = Math.min(amt, this.hooks.playerMoney());
        if (pay > 0) this.hooks.bet(pay);
        this.pot += pay; this.pBets += pay;
        if (this.hooks.playerMoney() <= 0) this.pAllin = true;
        if (this.pBets > this.currentBet) this.currentBet = this.pBets;
      } else {
        const pay = Math.min(amt, this.op.stack);
        this.op.stack -= pay;
        if (pay > this.op.stake - this.op.wonChips) {} // no-op
        this.op.lost += pay;
        this.pot += pay; this.aBets += pay;
        if (this.op.stack <= 0) this.aAllin = true;
        if (this.aBets > this.currentBet) this.currentBet = this.aBets;
      }
      this.render();
    }

    async playerAct() {
      return new Promise(res => { this._resolve = res; this.render(); });
    }
    _onBtn(t) {
      if (!this._resolve) return;
      const res = this._resolve; this._resolve = null;
      res({ t });
    }

    async aiAct() {
      await sleep(600 + rand(0, 500));
      const need = this.currentBet - this.aBets;
      let p = this.strength();
      if (this.persona === "reckless") p += 0.18 + Math.random() * 0.08;
      if (this.persona === "greedy" && this.op.lost > this.op.stake * 0.4) p += 0.15;   // 输钱上头
      if (this.persona === "greedy" && this.op.wonChips > this.op.stake * 0.5) p -= 0.12; // 赢钱转保守
      p = Math.max(0.05, Math.min(0.98, p));
      const potOdds = need > 0 ? need / (this.pot + need) : 0;
      const bluff = Math.random() < this.bluffProb();

      if (need === 0) {
        if (p > 0.66 || (bluff && p > 0.3)) return { t: "raise" };
        return { t: "call" }; // 过牌
      }
      if (p < potOdds - 0.08) {
        if (this.persona === "reckless" && p > 0.2) return Math.random() < 0.5 ? { t: "call" } : { t: "raise" };
        if (bluff && Math.random() < 0.3) return { t: "raise" };
        return { t: "fold" };
      }
      if (p > 0.85 && Math.random() < { sage: 0.35, reckless: 0.5, greedy: 0.25, balanced: 0.25 }[this.persona]) {
        return this.op.stack > this.pot ? { t: "raise" } : { t: "allin" };
      }
      if (bluff && Math.random() < 0.2) return { t: "raise" };
      return { t: "call" };
    }

    /* ---------- 结算 ---------- */
    async aiWinByFold() {
      this.op.stack += this.pot; this.op.wonChips += this.pot;
      this.msg = `你弃牌了。${this.op.name}收走底池 ${this.pot} 贯。`;
      this.hooks.onHandResult(false, this.pBets);
      this.pot = 0;
      this.render();
      await sleep(900);
    }

    async aiLoseByFold() {
      this.hooks.collect(this.pot); this.op.lost += this.pot;
      this.msg = `${this.op.name}弃牌！你收走底池 ${this.pot} 贯。`;
      this.hooks.onHandResult(true, this.aBets);
      this.pot = 0;
      this.render();
      await sleep(900);
    }

    async showdown() {
      this.revealOpp = true;
      this.msg = "摊牌！……";
      this.render();
      await sleep(900);
      const pr = evaluateHand([...this.hole, ...this.community]);
      const ar = evaluateHand([...this.oppHole, ...this.community]);
      const c = cmpRank(pr, ar);
      const pn = HAND_NAMES[pr[0]], an = HAND_NAMES[ar[0]];
      if (c > 0) {
        this.hooks.collect(this.pot);
        this.msg = `摊牌：<b>你的「${pn}」压过对方的「${an}」</b>——赢得底池 ${this.pot} 贯！`;
        this.bubble(LINES[this.persona].lose);
        this.hooks.onHandResult(true, this.pot);
        this.op.lost += this.pot;
      } else if (c < 0) {
        this.op.stack += this.pot; this.op.wonChips += this.pot;
        this.msg = `摊牌：对方的「${an}」压过你的「${pn}」——底池 ${this.pot} 贯被收走了。`;
        this.bubble(LINES[this.persona].win);
        this.hooks.onHandResult(false, this.pot);
      } else {
        const half = Math.floor(this.pot / 2);
        this.hooks.collect(half);
        this.op.stack += this.pot - half; this.op.wonChips += this.pot - half;
        this.msg = `双方同为「${pn}」，平分底池。`;
        this.hooks.onHandResult(true, 0);
      }
      this.pot = 0;
      this.render();
      await sleep(1400);
    }

    /* ---------- 透视眼（间谍/商人专属） ---------- */
    _xray() {
      if (this.xrayUsed || !this.xrayAvail) return;
      this.xrayUsed = true;
      this.revealOpp = true;
      this.msg = "👁 <b>透视眼发动</b>——你借着酒劲暗中瞥见了对方的底牌！";
      this.render();
    }

    /* ---------- 退出 / 结束 ---------- */
    _quit() {
      if (!this.betweenHands || this.over) return;
      this.quitFlag = true;
      this.finish(`你拱手告辞，${this.op.name}抱拳相送。今日输赢已记在账上。`);
    }

    finish(msg) {
      this.over = true;
      this.msg = msg;
      this.render();
      document.getElementById("pk-quit").disabled = true;
      document.getElementById("pk-quit").textContent = "结束";
      document.getElementById("pk-quit").disabled = false;
      document.getElementById("pk-quit").onclick = () => {
        document.getElementById("pk-modal").classList.add("hidden");
        this.hooks.onEnd && this.hooks.onEnd();
      };
    }
  }

  /* ---------------- 导出 ---------------- */
  window.PokerEval = { evaluateHand, evaluate5, cmpRank, newDeck, HAND_NAMES };
  window.TexasHoldemGame = TexasHoldemGame;
})();
