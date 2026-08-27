/* 食光记 · 主应用：路由 + 首页 + 列表 + 详情 + 收藏 + 设置 */
"use strict";

/* HTML 转义 */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

/* 解析 hash 查询参数，如 #/recipes?cat=早餐&q=蛋 */
function parseQuery(str) {
  const q = {};
  if (!str) return q;
  str.replace(/^\?/, "").split("&").forEach(kv => {
    const i = kv.indexOf("=");
    if (i > -1) {
      try { q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }
      catch (_) {}
    }
  });
  return q;
}
function toQuery(obj) {
  const parts = Object.entries(obj).filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => k + "=" + encodeURIComponent(v));
  return parts.length ? "?" + parts.join("&") : "";
}

/* ---------- Tab Bar ---------- */
function tabBarHTML() {
  const items = [
    { tab: "/", label: "首页", svg: '<path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5"/>' },
    { tab: "/recipes", label: "菜谱", svg: '<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>' },
    { tab: "/inventory", label: "食材", svg: '<path d="M5 9h14l-1 11H6L5 9ZM9 9V6a3 3 0 0 1 6 0v3"/>' },
    { tab: "/favorites", label: "收藏", svg: '<path d="M12 21s-7.5-4.6-9.5-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9Z"/>' },
    { tab: "/settings", label: "设置", svg: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1A7 7 0 0 0 14 5.4L13.8 3h-3.6L10 5.4a7 7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.6 1.5l.2 2.4h3.6l.2-2.4a7 7 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z"/>' }
  ];
  let html = '<nav class="tabbar">';
  items.forEach(item => {
    html += `<button class="tabbar__item" data-tab="${item.tab}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.svg}</svg>
      <span>${item.label}</span>
    </button>`;
  });
  html += "</nav>";
  return html;
}

function activeTabIndex(path) {
  if (path.startsWith("/recipe") || path.startsWith("/cook") || path === "/new") return 1;
  if (path === "/inventory" || path === "/match" || path === "/shopping") return 2;
  if (path === "/favorites") return 3;
  if (path === "/settings") return 4;
  return 0;
}

/* 包装：给无底栏页面加返回顶栏 */
function page(inner, title, backTo) {
  return `<div class="view">
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('${backTo || "/"}')">‹</button>
      <div class="topbar__title">${esc(title)}</div>
    </div>
    ${inner}
  </div>`;
}

/* 带默认返回顶部栏 + 主视图 */
function tabPage(inner, activeIdx) {
  return `<div class="view">${inner}</div>${tabBarHTML()}`;
}

/* ============ 首页 ============ */
function viewHome() {
  const recipes = Store.getRecipes();
  const favorites = recipes.filter(r => r.isFavorite);
  const recent = recipes.filter(r => r.lastCookedAt).sort((a, b) => b.lastCookedAt - a.lastCookedAt);

  const day = Math.floor(Date.now() / 86400000);
  const pick = recipes.length ? recipes[day % recipes.length] : null;

  let html = `<div class="view">
    <div class="hero-title">今天想吃什么？</div>

    <div class="searchbar" onclick="document.getElementById('home-search').focus()">
      <span>🔍</span>
      <input id="home-search" placeholder="搜索菜谱或食材..." onkeydown="if(event.key==='Enter'){const v=this.value.trim();App.searchQ=v;router.go('/recipes'+(v?'?q='+encodeURIComponent(v):''))}">
    </div>`;

  if (pick) {
    html += `<div class="section-title">今日推荐</div>
      ${featuredCard(pick)}`;
  }

  if (recent.length) {
    html += `<div class="section-title">最近做过</div>
      <div class="hscroll">${recent.slice(0, 8).map(r => miniCard(r, fmtRelativeCN(r.lastCookedAt))).join("")}</div>`;
  }

  if (favorites.length) {
    html += `<div class="section-title">我的收藏</div>
      <div class="hscroll">${favorites.slice(0, 8).map(miniCard).join("")}</div>`;
  }

  html += `<div class="section-title">快速分类</div>
    <div class="cat-grid">
      ${CATEGORIES.map(c => `
        <button class="chip chip--cat" onclick="router.go('/recipes?cat='+encodeURIComponent('${esc(c.name)}'))">
          <span class="em">${c.emoji}</span>${esc(c.name)}
        </button>`).join("")}
    </div>
  </div>${tabBarHTML()}`;

  return html;
}

function featuredCard(r) {
  const img = r.cover
    ? `<img class="featured__img" src="${r.cover}" alt="">`
    : `<div class="featured__fallback">🍳</div>`;
  return `<div class="featured" onclick="router.go('/recipe/${r.id}')">
    ${img}
    <div class="featured__info">
      <div class="featured__name">${esc(r.name)}</div>
      <div class="featured__meta">
        <span>⏱ ${fmtTime(totalMinutes(r))}</span>
        <span class="diff">${DIFF_LABEL[r.difficulty] || ""}</span>
      </div>
    </div>
  </div>`;
}

function miniCard(r, subLabel) {
  const img = r.cover
    ? `<img class="mini-card__img" src="${r.cover}" alt="">`
    : `<div class="mini-card__fb">🍳</div>`;
  return `<div class="mini-card" onclick="router.go('/recipe/${r.id}')">
    ${img}
    <div class="mini-card__name">${esc(r.name)}</div>
    <div class="mini-card__meta">
      <span>⏱ ${fmtTime(totalMinutes(r))}</span>
      ${subLabel ? `<span style="color:var(--accent)">${esc(subLabel)}</span>` : diffBadge(r.difficulty)}
    </div>
  </div>`;
}

/* ============ 菜谱列表 ============ */
function computeFilteredRecipes(params, searchText) {
  const q = searchText != null ? searchText : (params.q || "");
  const cat = params.cat || "";
  const fav = params.fav === "1";
  const diff = params.diff || "";
  const time = params.time ? parseInt(params.time, 10) : 0;
  let recipes = Store.getRecipes();
  if (fav) recipes = recipes.filter(r => r.isFavorite);
  if (cat) recipes = recipes.filter(r => (r.categories || []).includes(cat));
  if (diff) recipes = recipes.filter(r => r.difficulty === diff);
  if (time) recipes = recipes.filter(r => totalMinutes(r) <= time);
  if (q) {
    const nq = q.trim().toLowerCase();
    recipes = recipes.filter(r => r.name.toLowerCase().includes(nq) || (r.ingredients || []).some(i => i.name.toLowerCase().includes(nq)));
  }
  return { recipes, q, cat, fav, diff, time };
}

function recipeResultsHTML(result) {
  const { recipes, fav, gridMode } = result;
  if (!recipes.length) {
    return emptyHTML(fav ? "🤍" : "🍽️",
      fav ? "还没有收藏的菜谱" : "没有找到相关菜谱",
      fav ? "遇到喜欢的菜谱，可以先收藏起来。" : "换个关键词试试，或者新建一道菜吧。",
      `<div class="empty__action"><button class="btn btn--primary" onclick="router.go('/new')">新建菜谱</button></div>`);
  }
  if (gridMode) {
    return `<div class="grid" style="margin-top:14px">${recipes.map(gridCard).join("")}</div>`;
  }
  return `<div style="margin-top:14px">${recipes.map(listRow).join("")}</div>`;
}

function viewRecipes(params) {
  const q = params.q || (App._searchQ || "");
  App._searchQ = ""; // 消费后清空，避免泄漏
  const result = computeFilteredRecipes(params, q);
  const { cat, fav, diff, time } = result;
  const title = fav ? "收藏" : (cat || "全部菜谱");
  const gridMode = App.gridMode;

  function qs(o) {
    const parts = Object.entries(o).filter(([, v]) => v != null && v !== "");
    return parts.length ? "?" + parts.map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&") : "";
  }

  let inner = `
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('${fav ? "/favorites" : "/"}')">‹</button>
      <div class="topbar__title">${esc(title)}</div>
      <button style="font-size:20px;padding:6px" onclick="App.recipeForm=null;router.go('/new')">＋</button>
    </div>
    <div class="segment">
      <button class="segment__item active">本地菜谱</button>
    </div>
    <div class="searchbar" style="margin-top:8px">
      <span>🔍</span>
      <input id="list-search" placeholder="搜索菜谱或食材..." value="${esc(q)}"
        oninput="listSearch(this)">
    </div>`;

  // 筛选 chips（listFilter 保留其他条件与搜索词）
  inner += `<div class="hscroll" style="margin-top:10px">
    ${CATEGORIES.map(c => `<button class="chip${cat === c.name ? " active" : ""}" onclick="listFilter('cat','${esc(c.name)}')">${c.emoji} ${esc(c.name)}</button>`).join("")}
  </div>
  <div class="hscroll" style="margin-top:8px">
    ${["easy","medium","hard"].map(d => `<button class="chip${diff === d ? " active" : ""}" onclick="listFilter('diff','${d}')">${({easy:"简单",medium:"普通",hard:"困难"})[d]}</button>`).join("")}
    <span style="flex:1"></span>
    <button class="chip${gridMode ? "" : " active"}" onclick="listToggleGrid()">列表</button>
    <button class="chip${gridMode ? " active" : ""}" onclick="listToggleGrid()">卡片</button>
  </div>`;

  inner += `<div id="recipe-results">${recipeResultsHTML(result)}</div>`;

  return `<div class="view">${inner}</div>${tabBarHTML()}`;
}

/* 列表搜索：原地更新，不丢失焦点 */
window.listSearch = function(input) {
  const v = input.value;
  const params = parseQuery(location.hash.split("?")[1] || "");
  const result = computeFilteredRecipes(params, v);
  const el = document.getElementById("recipe-results");
  if (el) el.innerHTML = recipeResultsHTML(result);
};

/* 列表筛选条件点击：保留当前搜索词与其他条件 */
window.listFilter = function(key, value) {
  const params = parseQuery(location.hash.split("?")[1] || "");
  const searchVal = document.getElementById("list-search") ? document.getElementById("list-search").value.trim() : "";
  if (searchVal) params.q = searchVal;
  if (params[key] === value) delete params[key];
  else if (value) params[key] = value;
  else delete params[key];
  const parts = Object.entries(params).filter(([, v]) => v != null && v !== "");
  const qs = parts.length ? "?" + parts.map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&") : "";
  router.go("/recipes" + qs);
};

/* 列表/卡片模式切换 */
window.listToggleGrid = function() {
  App.gridMode = !App.gridMode;
  const params = parseQuery(location.hash.split("?")[1] || "");
  const searchVal = document.getElementById("list-search") ? document.getElementById("list-search").value.trim() : "";
  const result = computeFilteredRecipes(params, searchVal);
  const el = document.getElementById("recipe-results");
  if (el) el.innerHTML = recipeResultsHTML(result);
};

function listRow(r) {
  const img = r.cover
    ? `<img class="list-row__img" src="${r.cover}" alt="">`
    : `<div class="list-row__fb">🍳</div>`;
  return `<div class="list-row" onclick="router.go('/recipe/${r.id}')">
    ${img}
    <div class="list-row__body">
      <div class="list-row__name">${esc(r.name)}</div>
      <div class="list-row__meta">
        <span>⏱ ${fmtTime(totalMinutes(r))}</span>
        ${diffBadge(r.difficulty)}
      </div>
    </div>
    <button class="list-row__fav" onclick="event.stopPropagation();toggleFav('${r.id}')">${r.isFavorite ? "❤️" : "🤍"}</button>
  </div>`;
}

function gridCard(r) {
  const img = r.cover
    ? `<img class="grid-card__img" src="${r.cover}" alt="">`
    : `<div class="grid-card__fb">🍳</div>`;
  return `<div class="grid-card" onclick="router.go('/recipe/${r.id}')">
    <div class="grid-card__fav" onclick="event.stopPropagation();toggleFav('${r.id}')">${r.isFavorite ? "❤️" : "🤍"}</div>
    ${img}
    <div class="grid-card__name">${esc(r.name)}</div>
    <div class="grid-card__meta">
      <span>⏱ ${fmtTime(totalMinutes(r))}</span>
      ${diffBadge(r.difficulty)}
    </div>
  </div>`;
}

function toggleFav(id) {
  Store.toggleFavorite(id);
  if (App.refreshList) App.refreshList();
  render(router._resolve(window.location.hash));
}

/* ============ 详情 ============ */
function viewRecipeDetail(id) {
  const r = Store.getRecipe(id);
  if (!r) return emptyHTML("🍽️", "菜谱不存在", "它可能已被删除。");

  const cover = r.cover
    ? `<img class="cover__img" src="${r.cover}" alt="">`
    : `<div class="cover__fb">🍳</div>`;
  const cats = (r.categories || []).map(catBadge).join(" ");

  let stepsHTML = "";
  (r.steps || []).forEach((s, i) => {
    stepsHTML += `<div class="step">
      <div class="step__num">${i + 1}</div>
      <div class="step__body">
        <div class="step__text">${esc(s.instruction)}</div>
        ${s.image ? `<img class="step__img" src="${s.image}" alt="">` : ""}
        ${s.minutes ? `<div class="step__time">⏱ 预计 ${fmtTime(s.minutes)}</div>` : ""}
      </div>
    </div>`;
  });

  let ingHTML = "";
  (r.ingredients || []).forEach(ing => {
    ingHTML += `<div class="ing-row">
      <span>${esc(ing.name)}</span>
      ${ing.essential === false ? `<span class="opt">可选</span>` : ""}
      <span class="qty">${ingQty(ing)}</span>
    </div>
    ${ing.note ? `<div style="font-size:12px;color:var(--text2);padding:2px 0 6px">${esc(ing.note)}</div>` : ""}`;
  });

  let html = `<div class="view view--notab">
    <div class="cover">
      ${cover}
      <div class="cover__actions">
        <button class="cover__btn" onclick="router.go('/recipes')">‹</button>
        <div style="display:flex;gap:10px">
          <button class="cover__btn fav${r.isFavorite ? " on" : ""}" onclick="toggleFav('${r.id}')">${r.isFavorite ? "❤️" : "🤍"}</button>
          <button class="cover__btn" onclick="router.go('/recipe/${r.id}/edit')">✎</button>
        </div>
      </div>
    </div>

    <div class="detail-name">${esc(r.name)}</div>
    <div class="detail-meta">
      <span>⏱ 共 <b>${fmtTime(totalMinutes(r))}</b></span>
      <span>${r.difficulty === "hard" ? "🔥" : ""} ${DIFF_LABEL[r.difficulty] || ""}</span>
      <span>👥 ${r.servings} 人份</span>
    </div>
    <div class="meta-row" style="margin-top:8px">${cats}</div>
    ${(r.cookCount || 0) > 0
      ? `<div style="font-size:12px;color:var(--text2);margin-top:8px">🍳 做过 ${r.cookCount} 次${r.lastCookedAt ? " · 最近 " + fmtRelativeCN(r.lastCookedAt) : ""}</div>`
      : ""}

    <div class="actions">
      <button class="btn btn--primary" onclick="router.go('/cook/${r.id}')">🍳 开始烹饪</button>
      <button class="btn btn--secondary" onclick="openShoppingSheet('${r.id}')">🛒 加入购物清单</button>
    </div>`;

  if (r.summary) {
    html += `<div class="section">
      <div class="section__head"><span class="em">📝</span>简介</div>
      <p style="font-size:14px;color:var(--text2);line-height:1.7">${esc(r.summary)}</p>
    </div>`;
  }

  html += `<div class="section">
    <div class="section__head"><span class="em">🥕</span>食材</div>
    ${ingHTML}
  </div>`;

  html += `<div class="section">
    <div class="section__head"><span class="em">📋</span>制作步骤</div>
    ${stepsHTML}
  </div>`;

  if (r.tip) {
    html += `<div class="section">
      <div class="section__head"><span class="em">💡</span>烹饪小贴士</div>
      <div class="tip"><span class="em">✨</span><p>${esc(r.tip)}</p></div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

/* 加入购物清单：选择缺少的食材 */
function openShoppingSheet(id) {
  const r = Store.getRecipe(id);
  if (!r) return;
  const inv = Store.getInventory();
  const have = haveSet(inv);
  const defaultSelected = (r.ingredients || []).filter(i => !have.has(i.name.trim().toLowerCase()));

  let itemsHTML = "";
  (r.ingredients || []).forEach((ing, idx) => {
    const isMissing = !have.has(ing.name.trim().toLowerCase());
    itemsHTML += `<label class="row-item" style="cursor:pointer">
      <span class="checkbox" id="shop-chk-${idx}">${isMissing ? "" : "✓"}</span>
      <div class="text" style="flex:1">
        ${esc(ing.name)}
        <div class="sub">需要 ${ingQty(ing)}${isMissing ? " · 缺少" : " · 已有"}</div>
      </div>
    </label>`;
  });

  const mask = document.getElementById("dialog-mask");
  mask.innerHTML = `<div class="dialog">
    <div class="dialog__title">加入购物清单</div>
    <div class="dialog__msg">默认勾选库存里缺少的食材</div>
    <div style="margin-bottom:14px">${itemsHTML}</div>
    <div class="dialog__btns">
      <button class="btn btn--primary" id="shop-confirm">添加</button>
      <button class="btn btn--secondary" id="shop-cancel">取消</button>
    </div>
  </div>`;
  mask.classList.add("show");

  const chosen = defaultSelected.map(i => i.name);
  mask.querySelectorAll(".row-item").forEach((row, idx) => {
    row.onclick = () => {
      const ing = r.ingredients[idx];
      const box = mask.querySelector("#shop-chk-" + idx);
      const i = chosen.indexOf(ing.name);
      if (i > -1) { chosen.splice(i, 1); box.textContent = ""; box.classList.remove("on"); }
      else { chosen.push(ing.name); box.textContent = "✓"; box.classList.add("on"); }
    };
  });
  // 初始化勾选状态
  mask.querySelectorAll(".row-item").forEach((row, idx) => {
    const ing = r.ingredients[idx];
    const box = mask.querySelector("#shop-chk-" + idx);
    const on = chosen.includes(ing.name);
    box.classList.toggle("on", on);
    box.textContent = on ? "✓" : "";
  });

  mask.querySelector("#shop-confirm").onclick = () => {
    let added = 0;
    (r.ingredients || []).forEach(ing => {
      if (!chosen.includes(ing.name)) return;
      const list = Store.getShopping();
      const dup = list.some(s => !s.isCompleted && s.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
      if (dup) return;
      Store.addShopping({ name: ing.name, quantity: ing.quantity, unit: ing.unit, sourceRecipe: r.name });
      added++;
    });
    mask.classList.remove("show");
    toast(added ? `已将 ${added} 项加入购物清单` : "这些食材已在清单中");
  };
  mask.querySelector("#shop-cancel").onclick = () => mask.classList.remove("show");
}

/* ============ 收藏 ============ */
function viewFavorites() {
  return viewRecipes({ fav: "1" });
}

/* ============ 设置 ============ */
function viewSettings() {
  const recipes = Store.getRecipes();
  const inv = Store.getInventory();
  const shop = Store.getShopping();
  const favCount = recipes.filter(r => r.isFavorite).length;

  let html = `<div class="view">
    <div class="hero-title">设置</div>

    <div class="card card__pad" style="display:flex;align-items:center;gap:14px">
      <div style="width:60px;height:60px;border-radius:16px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:28px">🍳</div>
      <div>
        <div style="font-weight:700;font-size:17px">食光记</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">本地菜谱 · 数据只保存在你的 iPhone</div>
      </div>
    </div>

    <div class="section-label">我的数据</div>
    <div class="setting-row"><span class="em">📚</span><div class="body"><div class="t">菜谱</div></div><div class="val">${recipes.length}</div></div>
    <div class="setting-row"><span class="em">❤️</span><div class="body"><div class="t">收藏</div></div><div class="val">${favCount}</div></div>
    <div class="setting-row"><span class="em">🥬</span><div class="body"><div class="t">库存食材</div></div><div class="val">${inv.length}</div></div>
    <div class="setting-row"><span class="em">🛒</span><div class="body"><div class="t">购物清单</div></div><div class="val">${shop.length}</div></div>

    <div class="section-label">数据管理</div>
    <div class="card">
      <button class="setting-row" style="width:100%;border-radius:0;box-shadow:none;margin-bottom:0;border-bottom:0.5px solid var(--sep)" onclick="showDialog('恢复完整菜谱库？','将删除现有菜谱并重新载入 60 道本地菜谱。',()=>{Store.restoreSeeds();render(router._resolve(window.location.hash));toast('已恢复完整菜谱库')},'恢复')">
        <span class="em">🔄</span><div class="body"><div class="t">恢复完整菜谱库</div></div>
      </button>
      <button class="setting-row" style="width:100%;border-radius:0;box-shadow:none;margin-bottom:0;color:var(--fav)" onclick="showDialog('清空所有数据？','将删除全部菜谱、食材和购物清单，无法恢复。',()=>{Store.resetAll();render(router._resolve(window.location.hash));toast('已清空所有数据')},'清空')">
        <span class="em">🗑️</span><div class="body"><div class="t">清空所有数据</div></div>
      </button>
    </div>

    <div class="section-label">外观</div>
    <div class="setting-row"><span class="em">🌙</span><div class="body"><div class="t">深色模式</div><div class="s">跟随系统自动切换</div></div></div>

    <div class="section-label">未来功能</div>
    <div class="card card__pad">
      <div style="font-weight:600;font-size:14px">✨ AI 智能推荐（规划中）</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.6">拍照识别菜品、拍冰箱识别食材、AI 推荐菜谱等功能正在规划中。</div>
    </div>

    <div class="footer-note">食光记 v1.0 · 用心做好每一道菜</div>
  </div>${tabBarHTML()}`;

  return html;
}

/* 暴露给 inline handler 的命名空间 */
window.App = window.App || { searchQ: "", gridMode: false, recipeForm: null };
window.Store = Store;
window.router = router;
window.render = render;
window.toggleFav = toggleFav;
window.openShoppingSheet = openShoppingSheet;
window.toast = toast;
window.showDialog = showDialog;
