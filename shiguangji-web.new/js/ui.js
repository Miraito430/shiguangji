/* 食光记 · UI 工具函数 */
"use strict";

/* 快捷创建 HTML 元素 */
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k === "value") e.value = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) { if (c != null) e.append(typeof c === "string" ? document.createTextNode(c) : c); }
  return e;
}

/* 时长显示 */
function fmtTime(min) {
  if (!min || min <= 0) return "";
  if (min < 60) return min + " 分钟";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? h + " 小时 " + m + " 分钟" : h + " 小时";
}

/* 总时长 */
function totalMinutes(r) { return (r.prepMinutes || 0) + (r.cookMinutes || 0); }

/* 数量显示 */
function fmtQty(q, u) {
  if (u) return q + " " + u;
  return String(q);
}

/* 中文日期：今天 / 昨天 / 明天 / M月d日 / yyyy年M月d日 */
function fmtDateCN(input) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startD - startToday) / 86400000);

  if (diffDays === 0) return "今天";
  if (diffDays === -1) return "昨天";
  if (diffDays === 1) return "明天";

  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (d.getFullYear() === today.getFullYear()) {
    return month + "月" + day + "日";
  }
  return d.getFullYear() + "年" + month + "月" + day + "日";
}

/* 中文日期 + 时间（今天 HH:mm / M月d日 HH:mm） */
function fmtDateTimeCN(input) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const datePart = fmtDateCN(d);
  return datePart + " " + hh + ":" + mm;
}

/* 中文相对时间：刚刚 / X分钟前 / X小时前 / X天前 / 日期 */
function fmtRelativeCN(input) {
  const t = new Date(input).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return min + " 分钟前";
  const hour = Math.floor(min / 60);
  if (hour < 24) return hour + " 小时前";
  const day = Math.floor(hour / 24);
  if (day < 7) return day + " 天前";
  return fmtDateCN(input);
}

/* 匹配拥有品名集合 */
function haveSet(inv) {
  return new Set((inv || []).map(i => i.name.trim().toLowerCase()));
}

/* 分类 emoji 获取 */
function catEmoji(name) { return CATEGORY_EMOJI[name] || "🏷️"; }

/* 难度 badge HTML */
function diffBadge(d) {
  const cls = { easy: "easy", medium: "medium", hard: "hard" }[d] || "easy";
  const label = DIFF_LABEL[d] || d;
  return `<span class="badge-diff ${cls}">${label}</span>`;
}

/* 分类 tag HTML */
function catBadge(name) {
  return `<span class="badge-cat">${catEmoji(name)} ${name}</span>`;
}

/* checkbox 组件 HTML */
function checkbox(on) {
  return `<span class="checkbox${on ? " on" : ""}">${on ? "✓" : ""}</span>`;
}

/* 食材数量小计 */
function ingQty(ing) {
  if (ing.unit) return ing.quantity + " " + ing.unit;
  return String(ing.quantity);
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- 确认对话框 ---------- */
function showDialog(title, msg, onConfirm, confirmText, cancelText) {
  const mask = document.getElementById("dialog-mask");
  mask.innerHTML = `
    <div class="dialog">
      <div class="dialog__title">${title}</div>
      <div class="dialog__msg">${msg}</div>
      <div class="dialog__btns">
        <button class="btn btn--primary" id="dlg-confirm">${confirmText || "确定"}</button>
        <button class="btn btn--secondary" id="dlg-cancel">${cancelText || "取消"}</button>
      </div>
    </div>`;
  mask.classList.add("show");
  mask.querySelector("#dlg-confirm").onclick = () => { mask.classList.remove("show"); if (onConfirm) onConfirm(); };
  mask.querySelector("#dlg-cancel").onclick = () => mask.classList.remove("show");
}

/* ---------- 路由 ---------- */
const router = {};
router.current = null;

router.go = function (path) {
  if (path.startsWith("#")) path = path.slice(1);
  window.location.hash = "#" + path;
};

router.on = function (pattern, handler) {
  this._routes = this._routes || [];
  this._routes.push({ pattern, handler });
};

router._resolve = function (hash) {
  const path = (hash || "").replace(/^#/, "") || "/";
  for (const r of this._routes) {
    const match = path.match(r.pattern);
    if (match) return r.handler(match);
  }
  return this._notFound ? this._notFound() : "";
};

router.notFound = function (fn) { this._notFound = fn; };

/* 监听 hash 变化 */
window.addEventListener("hashchange", () => {
  const html = router._resolve(window.location.hash);
  render(html);
});

/* ---------- 渲染 ---------- */
function render(html) {
  const app = document.getElementById("app");
  app.innerHTML = html;
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: "instant" }); }

/* ---------- 图片压缩 ---------- */
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
async function compressImage(file, maxDim = 1280, quality = 0.8) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const cvs = document.createElement("canvas");
  cvs.width = Math.round(img.width * scale);
  cvs.height = Math.round(img.height * scale);
  const ctx = cvs.getContext("2d");
  ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
  return cvs.toDataURL("image/jpeg", quality);
}

/* ---------- 筛选栏 HTML ---------- */
function filterBarHTML(allItems, categories) {
  let html = `<div class="segment">`;
  const items = [{ value: "all", label: "全部" }, ...categories];
  items.forEach(cat => {
    const active = (allItems || cat.value === "all") ? "active" : "";
    html += `<button class="segment__item ${active}" data-cat="${cat.value}">${cat.label}</button>`;
  });
  html += `</div>`;
  return html;
}

/* ---------- 空状态 ---------- */
function emptyHTML(icon, title, subtitle, action) {
  return `<div class="empty">
    <div class="empty__icon">${icon}</div>
    <div class="empty__title">${title}</div>
    <div class="empty__sub">${subtitle}</div>
    ${action || ""}
  </div>`;
}

/* ---------- 切换底部 Tab ---------- */
function updateTabBar(activeIdx) {
  const items = document.querySelectorAll(".tabbar__item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeIdx);
  });
}

/* ---------- 点击 Tab 切换路由 ---------- */
function setupTabBar() {
  document.addEventListener("click", function (e) {
    const tabItem = e.target.closest("[data-tab]");
    if (!tabItem) return;
    const path = tabItem.dataset.tab;
    router.go(path);
  });
}