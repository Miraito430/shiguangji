/* 食光记 · 烹饪模式（深色全屏，分步 + 计时） */
"use strict";

let cookState = {
  step: 0,
  remaining: 0,
  running: false,
  done: false,
  timer: null
};

function viewCook(id) {
  const r = Store.getRecipe(id);
  if (!r) return `<div class="view"><div class="empty">🍽️<br>菜谱不存在</div></div>`;

  // 记录“最近做过”
  Store.recordCooked(id);

  const steps = r.steps || [];
  if (!steps.length) {
    return `<div id="cook-view" class="cooking">
      <div class="cook-top">
        <button class="close" onclick="router.go('/recipe/${id}')">✕</button>
        <div class="name">${esc(r.name)}</div>
        <div class="count"></div>
      </div>
      <div class="cook-done">
        <div class="em">🎉</div>
        <h2>完成！</h2>
        <p>「${esc(r.name)}」没有制作步骤，直接享用吧！</p>
        <div style="margin-top:28px"><button class="btn btn--primary" style="max-width:260px;margin:0 auto" onclick="router.go('/recipe/${id}')">返回菜谱</button></div>
      </div>
    </div>`;
  }

  cookState = { step: 0, remaining: 0, running: false, done: false, timer: null };

  return cookHTML(r, steps);
}

function cookHTML(r, steps) {
  const s = steps[cookState.step];
  const img = s && s.image ? `<img class="cook-step-img" src="${s.image}" alt="">` : "";

  let timerHTML = `<div class="cook-timer">
    <button class="start" onclick="cookStartTimer()">⏱ 计时 ${fmtTime(s.minutes)}</button>
  </div>`;

  const isLast = cookState.step >= steps.length - 1;

  let html = `<div id="cook-view" class="cooking">
    <div class="cook-top">
      <button class="close" onclick="cookExit('${r.id}')">✕</button>
      <div class="name">${esc(r.name)}</div>
      <div class="count">${cookState.step + 1} / ${steps.length}</div>
    </div>
    <div class="cook-body">
      ${img}
      <div class="cook-step-text">${esc(s.instruction)}</div>
      ${s.minutes ? timerHTML : ""}
    </div>
    <div class="cook-nav">
      <button class="btn prev" onclick="cookPrev('${r.id}')" ${cookState.step === 0 ? "disabled" : ""}>‹ 上一步</button>
      <button class="btn next" onclick="cookNext('${r.id}')">${isLast ? "完成 ✓" : "下一步 ›"}</button>
    </div>
  </div>`;

  return html;
}

function cookRerender(id) {
  const r = Store.getRecipe(id);
  const steps = r.steps || [];
  if (cookState.step >= steps.length) {
    const el = document.getElementById("cook-view");
    el.innerHTML = `<div class="cook-done">
      <div class="em">🎉</div>
      <h2>完成！</h2>
      <p>「${esc(r.name)}」制作完成，享用吧！</p>
      <div style="margin-top:28px"><button class="btn btn--primary" style="max-width:260px;margin:0 auto" onclick="router.go('/recipe/${id}')">返回菜谱</button></div>
    </div>`;
    return;
  }
  const el = document.getElementById("cook-view");
  const temp = document.createElement("div");
  temp.innerHTML = cookHTML(r, steps);
  el.outerHTML = temp.firstChild.outerHTML;
}

function cookExit(id) {
  cookStopTimer();
  router.go("/recipe/" + id);
}

function cookPrev(id) {
  if (cookState.step === 0) return;
  cookStopTimer();
  cookState.step--;
  cookRerender(id);
}

function cookNext(id) {
  cookStopTimer();
  cookState.step++;
  cookRerender(id);
}

/* 计时器 */
function cookStartTimer() {
  const r = Store.getRecipe(App.lastCookId);
  const s = (r && r.steps) ? r.steps[cookState.step] : null;
  if (!s || !s.minutes) return;
  cookState.remaining = s.minutes * 60;
  cookState.running = true;
  cookState.done = false;
  renderTimer(r.id, s);
}

function renderTimer(id, s) {
  const el = document.getElementById("cook-view");
  if (!el) return;
  const timerArea = el.querySelector(".cook-timer");
  if (!timerArea) return;
  timerArea.innerHTML = `
    <div class="time" id="cook-time">${fmtCountdown(cookState.remaining)}</div>
    <div style="margin-top:8px"><button style="color:rgba(255,255,255,.55);font-size:13px" onclick="cookStopTimer()">取消计时</button></div>`;

  clearInterval(cookState.timer);
  cookState.timer = setInterval(() => {
    if (!cookState.running) return;
    cookState.remaining--;
    const timeEl = document.getElementById("cook-time");
    if (timeEl) {
      timeEl.textContent = fmtCountdown(cookState.remaining);
      if (cookState.remaining <= 10) timeEl.classList.add("warn");
    }
    if (cookState.remaining <= 0) {
      cookStopTimer();
      cookState.done = true;
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (_) {}
      beep();
      toast("⏲️ 时间到！");
    }
  }, 1000);
}

function cookStopTimer() {
  cookState.running = false;
  if (cookState.timer) clearInterval(cookState.timer);
  cookState.timer = null;
  cookState.done = false;
  const timeEl = document.getElementById("cook-time");
  if (timeEl) timeEl.textContent = fmtCountdown(0);
}

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

/* 提示音（Web Audio） */
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    [0, 0.25, 0.5].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 0 ? 880 : 660;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    });
  } catch (_) {}
}

window.viewCook = viewCook;
window.cookStartTimer = cookStartTimer;
window.cookStopTimer = cookStopTimer;
window.cookPrev = cookPrev;
window.cookNext = cookNext;
window.cookExit = cookExit;