/* =====================================================================
   三国立志传 · 合战系统（简化战棋）
   - 兵种克制：枪🔱 克 骑🐎 克 弓🏹 克 枪（×1.5 / 被克 ×0.7）
   - 地形：山林（弓+30%、骑-30%）、河流（骑-40%、枪+15%）、平地
   - 士气：击杀+8、被击杀-12、克制命中加成；士气归零 → 溃败
   - 统率/武力影响初始士气与部队攻击力
   封装：仅暴露 window.BattleGame
   ===================================================================== */
(function () {
  "use strict";

  const TYPES = {
    qiang: { name: "枪兵", icon: "🔱", hp: 100, atk: 62, move: 1, range: 1 },
    qi:    { name: "骑兵", icon: "🐎", hp: 85,  atk: 70, move: 2, range: 1 },
    gong:  { name: "弓兵", icon: "🏹", hp: 75,  atk: 58, move: 1, range: 2 },
  };
  const BEATS = { qiang: "qi", qi: "gong", gong: "qiang" };
  const SIDE_NAME = { p: "我方", e: "敌方" };

  const W = 720, H = 460, TS = 90, TH = 76, OX = 45, OY = 50, COLS = 7, ROWS = 5;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  class BattleGame {
    constructor(cfg) {
      this.cfg = cfg;
      this.hooks = cfg.hooks;
      this.cv = document.getElementById("battle-canvas");
      this.ctx = this.cv.getContext("2d");
      this.over = false; this.closed = false;
      this.sel = null; this.hover = null;
      this._msg = "";

      // 地形生成（两翼出生列保持平地）
      this.terr = {};
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) this.terr[x + "," + y] = "plain";
      let placed = 0;
      while (placed < 5) { const x = rand(1, COLS - 2), y = rand(0, ROWS - 1); if (this.terr[x + "," + y] === "plain") { this.terr[x + "," + y] = "forest"; placed++; } }
      placed = 0;
      while (placed < 3) { const x = rand(1, COLS - 2), y = rand(0, ROWS - 1); if (this.terr[x + "," + y] === "plain") { this.terr[x + "," + y] = "river"; placed++; } }

      // 部队
      this.units = [];
      ["qiang", "qi", "gong"].forEach((t, i) => this.units.push(this.mkUnit("p", t, 0, i + 1)));
      ["qiang", "qi", "gong"].forEach((t, i) => this.units.push(this.mkUnit("e", t, COLS - 1, i + 1)));

      this.morale = { p: Math.min(90, 50 + Math.floor(cfg.stats.leader / 5)), e: 60 };

      this._bind();
      document.getElementById("battle-title").textContent =
        `合战 · ${cfg.playerName || "我军"} vs ${cfg.enemy.name}军`;
      this.msg = "战役开始！点击我方单位：移动或攻击（每单位每回合限一次行动）。";
      requestAnimationFrame(() => this.loop());
      this.turnLoop();
    }

    static startGame(cfg) { return new BattleGame(cfg); }

    mkUnit(side, type, x, y) {
      const t = TYPES[type];
      const bonus = side === "p"
        ? Math.floor(this.cfg.stats.force / 20) + Math.floor(this.cfg.stats.leader / 25)
        : Math.floor(this.cfg.enemy.force / 20);
      return { side, type, x, y, hp: t.hp, hpMax: t.hp, atk: t.atk + bonus, acted: false, dead: false };
    }

    _bind() {
      document.getElementById("battle-modal").classList.remove("hidden");
      document.getElementById("battle-end").onclick = () => {
        if (this.phase === "p" && !this.over && this._pDone) { const r = this._pDone; this._pDone = null; r(); }
      };
      document.getElementById("battle-flee").onclick = () => {
        if (!this.over && this.phase === "p") this.finish(false, true);
      };
      this.cv.addEventListener("mousemove", e => {
        const pt = this.tileFromEvent(e);
        this.hover = pt;
      });
      this.cv.addEventListener("mouseleave", () => { this.hover = null; });
      this.cv.addEventListener("click", e => this.onClick(this.tileFromEvent(e)));
    }

    tileFromEvent(e) {
      const rect = this.cv.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width * W;
      const cy = (e.clientY - rect.top) / rect.height * H;
      const x = Math.floor((cx - OX) / TS), y = Math.floor((cy - OY) / TH);
      return (x >= 0 && x < COLS && y >= 0 && y < ROWS) ? { x, y } : null;
    }

    unitAt(x, y) { return this.units.find(u => !u.dead && u.x === x && u.y === y); }
    alive(side) { return this.units.filter(u => u.side === side && !u.dead); }
    uname(u) { return `${SIDE_NAME[u.side]}${TYPES[u.type].name}`; }

    canMove(u, x, y) {
      return !this.unitAt(x, y) && man(u, { x, y }) <= TYPES[u.type].move && man(u, { x, y }) > 0;
    }
    inRange(a, d) { return man(a, d) <= TYPES[a.type].range; }

    /* ---------- 主流程 ---------- */
    async turnLoop() {
      while (!this.over) {
        // 我方回合
        this.phase = "p";
        this.alive("p").forEach(u => u.acted = false);
        this.sel = null;
        this.msg = "我方回合——点击单位行动，全部行动完毕自动进入敌方回合。";
        await new Promise(res => { this._pDone = res; });
        if (this.over) return;
        // 敌方回合
        this.phase = "a";
        this.alive("e").forEach(u => u.acted = false);
        this.sel = null;
        this.msg = "敌方回合……";
        await sleep(600);
        for (const u of this.alive("e")) {
          if (this.over) return;
          await this.aiAct(u);
          await sleep(450);
          if (this.checkEnd()) return;
        }
        this.msg = "敌方行动完毕。";
        await sleep(400);
      }
    }

    maybeAutoEnd() {
      if (this.alive("p").every(u => u.acted) && this._pDone) {
        const r = this._pDone; this._pDone = null; r();
      }
    }

    onClick(pt) {
      if (!pt || this.over || this.phase !== "p") return;
      const u = this.unitAt(pt.x, pt.y);
      if (this.sel) {
        const s = this.sel;
        if (u && u.side === "e" && this.inRange(s, u)) {
          this.attack(s, u);
          s.acted = true; this.sel = null;
          if (!this.checkEnd()) this.maybeAutoEnd();
          return;
        }
        if (!u && this.canMove(s, pt.x, pt.y)) {
          s.x = pt.x; s.y = pt.y; s.acted = true; this.sel = null;
          this.msg = `${this.uname(s)}移动。`;
          this.maybeAutoEnd();
          return;
        }
        if (u && u.side === "p" && !u.acted) { this.sel = u; this.hint(u); return; }
        this.sel = null;
        this.msg = "取消选择。";
        return;
      }
      if (u && u.side === "p" && !u.acted) { this.sel = u; this.hint(u); }
      else if (u && u.side === "p" && u.acted) this.msg = "该部队本回合已行动。";
    }

    hint(u) {
      const t = TYPES[u.type];
      this.msg = `已选择「${t.name}」（移动 ${t.move} 格 / 攻击范围 ${t.range} 格）——点击空地移动，或点击红圈敌军攻击。`;
    }

    attack(a, d) {
      const terr = this.terr[a.x + "," + a.y];
      let mult = 1, beat = false, weak = false;
      if (BEATS[a.type] === d.type) { mult *= 1.5; beat = true; }
      if (BEATS[d.type] === a.type) { mult *= 0.7; weak = true; }
      if (terr === "forest") { if (a.type === "qi") mult *= 0.7; if (a.type === "gong") mult *= 1.3; }
      if (terr === "river") { if (a.type === "qi") mult *= 0.6; if (a.type === "qiang") mult *= 1.15; }
      if (this.terr[d.x + "," + d.y] === "forest") mult *= 0.85;
      const mf = 0.7 + this.morale[a.side] / 200;
      let dmg = Math.max(5, Math.round(a.atk * mult * mf * (0.85 + Math.random() * 0.3)));
      d.hp -= dmg;
      this.morale[a.side] = Math.min(100, this.morale[a.side] + (beat ? 6 : 3));
      let s = `${this.uname(a)} 攻击 ${this.uname(d)}`;
      if (beat) s += "——<b>兵种克制！</b>";
      if (weak) s += "（被克制…）";
      if (d.hp <= 0) {
        d.dead = true;
        this.morale[d.side] = Math.max(0, this.morale[d.side] - 12);
        this.morale[a.side] = Math.min(100, this.morale[a.side] + 8);
        s += `，一举击溃！${SIDE_NAME[d.side]}士气大挫！`;
      } else {
        s += `，造成 <b>${dmg}</b> 伤害（余 ${d.hp}/${d.hpMax}）。`;
      }
      this.msg = s;
    }

    async aiAct(u) {
      let targets = this.alive("p").filter(x => this.inRange(u, x));
      if (!targets.length) {
        // 向最近的我方部队移动
        let best = null, bd = 999;
        const foes = this.alive("p");
        if (!foes.length) return;
        for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
          if (this.unitAt(x, y)) continue;
          const m = Math.abs(x - u.x) + Math.abs(y - u.y);
          if (m === 0 || m > TYPES[u.type].move) continue;
          const d = Math.min(...foes.map(t => Math.abs(t.x - x) + Math.abs(t.y - y)));
          if (d < bd) { bd = d; best = { x, y }; }
        }
        if (best) { u.x = best.x; u.y = best.y; this.msg = `敌方${TYPES[u.type].name}逼近……`; }
        targets = this.alive("p").filter(x => this.inRange(u, x));
      }
      u.acted = true;
      if (targets.length) {
        targets.sort((a, b) => a.hp - b.hp);
        this.attack(u, targets[0]);
      }
    }

    checkEnd() {
      if (!this.alive("e").length || this.morale.e <= 0) { this.finish(true, false); return true; }
      if (!this.alive("p").length || this.morale.p <= 0) { this.finish(false, false); return true; }
      return false;
    }

    finish(win, fled) {
      if (this.over) return;
      this.over = true;
      this.sel = null;
      this.msg = fled ? "你鸣金收兵，撤出战场……"
        : win ? "——<b>大捷！</b>敌军溃不成军！——"
        : "——<b>败北……</b>收拢残兵，来日再战。——";
      setTimeout(() => {
        document.getElementById("battle-modal").classList.add("hidden");
        this.closed = true;
        this.hooks.onEnd && this.hooks.onEnd({ win, fled });
      }, 1400);
    }

    /* ---------- 渲染 ---------- */
    loop() {
      if (this.closed) return;
      this.draw();
      requestAnimationFrame(() => this.loop());
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#26221a";
      ctx.fillRect(0, 0, W, H);

      // 士气条
      this.bar(ctx, OX, 12, 240, "我方士气 " + this.morale.p, this.morale.p, "#4e7a5a");
      this.bar(ctx, W - OX - 240, 12, 240, "敌方士气 " + this.morale.e, this.morale.e, "#a8322a");
      ctx.fillStyle = "#c9a227"; ctx.font = "14px KaiTi, 楷体, serif"; ctx.textAlign = "center";
      ctx.fillText(this.phase === "p" ? "◀ 我方行动" : "敌方行动 ▶", W / 2, 22);

      // 棋盘
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        const t = this.terr[x + "," + y];
        ctx.fillStyle = t === "forest" ? "#31402f" : t === "river" ? "#2c3844" : "#3c382b";
        ctx.fillRect(OX + x * TS, OY + y * TH, TS - 2, TH - 2);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.strokeRect(OX + x * TS, OY + y * TH, TS - 2, TH - 2);
        if (t !== "plain") {
          ctx.font = "18px serif"; ctx.textAlign = "left";
          ctx.fillText(t === "forest" ? "⛰" : "🌊", OX + x * TS + 6, OY + y * TH + 20);
        }
        // 高亮：悬停 / 可移动 / 可攻击
        if (this.hover && this.hover.x === x && this.hover.y === y) {
          ctx.fillStyle = "rgba(240,230,205,0.10)";
          ctx.fillRect(OX + x * TS, OY + y * TH, TS - 2, TH - 2);
        }
        if (this.sel && this.phase === "p" && !this.unitAt(x, y) && this.canMove(this.sel, x, y)) {
          ctx.fillStyle = "rgba(110,160,230,0.22)";
          ctx.fillRect(OX + x * TS, OY + y * TH, TS - 2, TH - 2);
        }
      }

      // 攻击目标红圈
      if (this.sel && this.phase === "p") {
        this.alive("e").forEach(d => {
          if (!this.inRange(this.sel, d)) return;
          ctx.strokeStyle = "rgba(220,70,50,0.9)"; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(OX + d.x * TS + TS / 2 - 1, OY + d.y * TH + TH / 2 - 1, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        });
      }

      // 部队
      this.units.forEach(u => {
        if (u.dead) return;
        const cx = OX + u.x * TS + TS / 2 - 1, cy = OY + u.y * TH + TH / 2 - 1;
        ctx.save();
        if (u.acted) ctx.globalAlpha = 0.45;
        if (this.sel === u) {
          ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = u.side === "p" ? "#4e7a5a" : "#a8322a";
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#1c1913"; ctx.stroke();
        ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#f4ecdb";
        ctx.fillText(TYPES[u.type].icon, cx, cy - 4);
        // HP 条
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(cx - 26, cy + 16, 52, 7);
        ctx.fillStyle = u.hp / u.hpMax > 0.4 ? "#6fae5e" : "#c46a2a";
        ctx.fillRect(cx - 25, cy + 17, 50 * Math.max(0, u.hp / u.hpMax), 5);
        ctx.restore();
      });

      if (this._msg !== this.msg) {
        this._msg = this.msg;
        document.getElementById("battle-log").innerHTML = this.msg;
      }
    }

    bar(ctx, x, y, w, label, val, color) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x, y, w, 14);
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(100, val)) / 100, 12);
      ctx.fillStyle = "#f0e6cd"; ctx.font = "12px KaiTi, 楷体, serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(label, x + 4, y + 1);
    }
  }

  window.BattleGame = BattleGame;
})();
