/* 食光记 · 食材库存 / 我能做什么 / 购物清单 */
"use strict";

/* ---------- 食材库存 ---------- */
function viewInventory() {
  const inv = Store.getInventory();
  const expired = inv.filter(isExpired);
  const active = inv.filter(i => !isExpired(i));

  let inner = `
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('/')">‹</button>
      <div class="topbar__title">我的食材</div>
      <button style="font-size:20px;padding:6px" onclick="openInventoryForm()">＋</button>
    </div>
    <div class="segment">
      <button class="segment__item active" data-seg="inv" onclick="switchInvSeg('inv')">我的食材</button>
      <button class="segment__item" data-seg="match" onclick="switchInvSeg('match')">我能做什么</button>
      <button class="segment__item" data-seg="shop" onclick="switchInvSeg('shop')">购物清单</button>
    </div>`;

  if (!inv.length) {
    inner += emptyHTML("🥬", "厨房里还是空的",
      "把家里现有的食材记下来，就能知道今天能做什么菜。",
      `<div class="empty__action"><button class="btn btn--primary" onclick="openInventoryForm()">记录食材</button></div>`);
  } else {
    if (expired.length) {
      inner += `<div class="section-label" style="margin-top:14px">已过期</div>
        ${expired.map(invRow).join("")}`;
    }
    if (active.length) {
      inner += `<div class="section-label" style="margin-top:${expired.length ? "6px" : "14px"}">现有食材</div>
        ${active.map(invRow).join("")}`;
    }
  }

  return `<div class="view">${inner}</div>${tabBarHTML()}`;
}

function isExpired(item) {
  if (!item.expireDate) return false;
  // 归一到本地当天结束，到期日当天仍可使用
  const exp = new Date(item.expireDate);
  exp.setHours(23, 59, 59, 999);
  return exp < new Date();
}
function isNearExpiry(item) {
  if (isExpired(item) || !item.expireDate) return false;
  const exp = new Date(item.expireDate);
  exp.setHours(23, 59, 59, 999);
  return exp - Date.now() < 3 * 86400000;
}

function invRow(item) {
  const exp = isExpired(item);
  const near = isNearExpiry(item);
  const badge = exp ? `<span class="badge badge--exp">已过期</span>`
    : near ? `<span class="badge badge--near">临期</span>` : "";
  const dateStr = item.expireDate ? (exp ? "过期于 " : "到期 ") + fmtDateCN(item.expireDate) : "";
  return `<div class="row-item">
    <span style="font-size:20px;width:30px;text-align:center">🥬</span>
    <div class="text">
      ${esc(item.name)}
      <div class="sub">${fmtQty(item.quantity, item.unit)}${dateStr ? " · " + dateStr : ""}</div>
    </div>
    ${badge}
    <button class="del" onclick="openInventoryForm('${item.id}')">✎</button>
    <button class="del" onclick="delInventory('${item.id}')">✕</button>
  </div>`;
}

function delInventory(id) {
  showDialog("删除这个食材？", "", () => { Store.deleteInventory(id); render(router._resolve(window.location.hash)); }, "删除");
}

function openInventoryForm(id) {
  const item = id ? Store.getInventory().find(i => i.id === id) : null;
  const name = item ? item.name : "";
  const qty = item ? item.quantity : "1";
  const unit = item ? item.unit : "";
  const hasExp = item ? !!item.expireDate : false;
  const expDate = item && item.expireDate
    ? new Date(item.expireDate).toISOString().slice(0, 10)
    : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const note = item ? item.note || "" : "";

  const mask = document.getElementById("dialog-mask");
  mask.innerHTML = `<div class="dialog">
    <div class="dialog__title">${item ? "编辑食材" : "记录食材"}</div>
    <div style="margin-top:16px">
      <div class="field"><label>食材名称</label><input type="text" id="inv-name" value="${esc(name)}" placeholder="例如：鸡蛋"></div>
      <div class="row2">
        <div class="field"><label>数量</label><input type="text" id="inv-qty" value="${esc(qty)}" inputmode="decimal"></div>
        <div class="field"><label>单位</label><input type="text" id="inv-unit" value="${esc(unit)}" placeholder="个/L/克"></div>
      </div>
      <div class="field">
        <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="inv-has-exp" style="width:16px;height:16px;accent-color:var(--accent)"${hasExp ? " checked" : ""}> 记录过期日期</label>
      </div>
      <div class="field" id="inv-exp-field" style="${hasExp ? "" : "display:none"}">
        <label>过期日期</label><input type="date" id="inv-exp" value="${expDate}">
      </div>
      <div class="field"><label>备注（可选）</label><input type="text" id="inv-note" value="${esc(note)}"></div>
    </div>
    <div class="dialog__btns">
      <button class="btn btn--primary" id="inv-save">保存</button>
      <button class="btn btn--secondary" id="inv-cancel">取消</button>
    </div>
  </div>`;
  mask.classList.add("show");

  const hasExpBox = mask.querySelector("#inv-has-exp");
  hasExpBox.onchange = () => {
    mask.querySelector("#inv-exp-field").style.display = hasExpBox.checked ? "" : "none";
  };

  mask.querySelector("#inv-cancel").onclick = () => mask.classList.remove("show");
  mask.querySelector("#inv-save").onclick = () => {
    const n = mask.querySelector("#inv-name").value.trim();
    if (!n) { toast("请填写食材名称"); return; }
    const data = {
      name: n,
      quantity: parseFloat(mask.querySelector("#inv-qty").value) || 1,
      unit: mask.querySelector("#inv-unit").value.trim(),
      expireDate: hasExpBox.checked ? new Date(mask.querySelector("#inv-exp").value).toISOString() : null,
      note: mask.querySelector("#inv-note").value.trim()
    };
    if (item) Store.updateInventory(item.id, data);
    else Store.addInventory(data);
    mask.classList.remove("show");
    render(router._resolve(window.location.hash));
    toast("已保存");
  };
}

function switchInvSeg(seg) {
  router.go(seg === "match" ? "/match" : seg === "shop" ? "/shopping" : "/inventory");
}

/* ---------- 我能做什么 ---------- */
function viewMatch() {
  const recipes = Store.getRecipes();
  const inv = Store.getInventory();
  const invNames = inv.map(i => i.name);
  const matches = MATCH.matches(recipes, invNames);

  let inner = `
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('/inventory')">‹</button>
      <div class="topbar__title">我能做什么</div>
    </div>
    <div class="segment">
      <button class="segment__item" data-seg="inv" onclick="switchInvSeg('inv')">我的食材</button>
      <button class="segment__item active" data-seg="match" onclick="switchInvSeg('match')">我能做什么</button>
      <button class="segment__item" data-seg="shop" onclick="switchInvSeg('shop')">购物清单</button>
    </div>`;

  if (!inv.length) {
    inner += emptyHTML("🤔", "还没有食材记录",
      "先在「我的食材」里记下家里有什么，就知道能做什么菜了。",
      `<div class="empty__action"><button class="btn btn--primary" onclick="switchInvSeg('inv')">去记录食材</button></div>`);
  } else if (!matches.length) {
    inner += emptyHTML("🥬", "没有匹配的菜谱", "试试添加更多食材或新建菜谱。");
  } else {
    inner += matches.map(m => {
      const img = m.recipe.cover ? `<img src="${m.recipe.cover}" alt="">` : `<div class="fb">🍳</div>`;
      const pct = Math.round(m.ratio * 100);
      const missingHTML = m.missing.length
        ? `<div class="match-missing">缺少：${m.missing.map(esc).join("、")}</div>` : "";
      const allHave = m.matched >= m.total ? `<span class="pct">全部都有 ✓</span>` : `<span class="pct">${pct}%</span>`;
      return `<div class="match-card" onclick="router.go('/recipe/${m.recipe.id}')">
        <div class="match-head">
          ${img}
          <div>
            <div class="match-name">${esc(m.recipe.name)}</div>
            <div class="match-sub">⏱ ${fmtTime(totalMinutes(m.recipe))}</div>
          </div>
        </div>
        <div class="match-bar">
          <span style="font-size:12px;font-weight:600;color:var(--accent)">已有食材 ${m.matched}/${m.total}</span>
          <div class="track"><div class="fill" style="width:${Math.min(m.ratio * 100, 100)}%"></div></div>
          ${allHave}
        </div>
        ${missingHTML}
      </div>`;
    }).join("");
  }

  return `<div class="view">${inner}</div>${tabBarHTML()}`;
}

/* ---------- 购物清单 ---------- */
function viewShopping() {
  const shop = Store.getShopping();
  const active = shop.filter(s => !s.isCompleted);
  const done = shop.filter(s => s.isCompleted);

  let inner = `
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('/inventory')">‹</button>
      <div class="topbar__title">购物清单</div>
      <button style="font-size:20px;padding:6px" onclick="openShoppingForm()">＋</button>
    </div>
    <div class="segment">
      <button class="segment__item" data-seg="inv" onclick="switchInvSeg('inv')">我的食材</button>
      <button class="segment__item" data-seg="match" onclick="switchInvSeg('match')">我能做什么</button>
      <button class="segment__item active" data-seg="shop" onclick="switchInvSeg('shop')">购物清单</button>
    </div>`;

  if (!shop.length) {
    inner += emptyHTML("🛒", "购物清单是空的",
      "在菜谱详情点「加入购物清单」，或手动添加要买的食材。",
      `<div class="empty__action"><button class="btn btn--primary" onclick="openShoppingForm()">添加食材</button></div>`);
  } else {
    inner += active.map(shopRow).join("");
    if (done.length) {
      inner += `<div class="section-label" style="margin-top:16px">已完成</div>
        ${done.map(shopRow).join("")}
        <button class="btn btn--danger" style="margin-top:14px;width:100%" onclick="showDialog('清空已完成？','',()=>{const n=Store.clearCompletedShopping();render(router._resolve(window.location.hash));toast('已清空 '+n+' 项')},'清空')">🗑️ 清空已完成</button>`;
    }
  }

  return `<div class="view">${inner}</div>${tabBarHTML()}`;
}

function shopRow(item) {
  const sub = [fmtQty(item.quantity, item.unit), item.note].filter(Boolean).join(" · ");
  return `<div class="row-item${item.isCompleted ? " done" : ""}">
    <button class="checkbox${item.isCompleted ? " on" : ""}" onclick="toggleShop('${item.id}')">${item.isCompleted ? "✓" : ""}</button>
    <div class="text">
      ${esc(item.name)}
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      ${item.sourceRecipe ? `<div class="sub" style="color:var(--missing)">来自「${esc(item.sourceRecipe)}」</div>` : ""}
    </div>
    <button class="del" onclick="delShop('${item.id}')">✕</button>
  </div>`;
}

function toggleShop(id) {
  Store.toggleShopping(id);
  render(router._resolve(window.location.hash));
}
function delShop(id) {
  Store.deleteShopping(id);
  render(router._resolve(window.location.hash));
}

function openShoppingForm() {
  const mask = document.getElementById("dialog-mask");
  mask.innerHTML = `<div class="dialog">
    <div class="dialog__title">添加到清单</div>
    <div style="margin-top:16px">
      <div class="field"><label>名称</label><input type="text" id="shop-name" placeholder="例如：葱"></div>
      <div class="row2">
        <div class="field"><label>数量</label><input type="text" id="shop-qty" value="1" inputmode="decimal"></div>
        <div class="field"><label>单位</label><input type="text" id="shop-unit" placeholder="个/把/L"></div>
      </div>
      <div class="field"><label>备注（可选）</label><input type="text" id="shop-note"></div>
    </div>
    <div class="dialog__btns">
      <button class="btn btn--primary" id="shop-save">添加</button>
      <button class="btn btn--secondary" id="shop-cancel">取消</button>
    </div>
  </div>`;
  mask.classList.add("show");

  mask.querySelector("#shop-cancel").onclick = () => mask.classList.remove("show");
  mask.querySelector("#shop-save").onclick = () => {
    const n = mask.querySelector("#shop-name").value.trim();
    if (!n) { toast("请填写名称"); return; }
    Store.addShopping({
      name: n,
      quantity: parseFloat(mask.querySelector("#shop-qty").value) || 1,
      unit: mask.querySelector("#shop-unit").value.trim(),
      note: mask.querySelector("#shop-note").value.trim()
    });
    mask.classList.remove("show");
    render(router._resolve(window.location.hash));
    toast("已添加");
  };
}

window.viewInventory = viewInventory;
window.viewMatch = viewMatch;
window.viewShopping = viewShopping;
window.openInventoryForm = openInventoryForm;
window.openShoppingForm = openShoppingForm;
window.switchInvSeg = switchInvSeg;