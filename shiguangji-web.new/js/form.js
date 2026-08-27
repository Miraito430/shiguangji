/* 食光记 · 新增 / 编辑菜谱表单 */
"use strict";

function viewRecipeForm(id) {
  const isEdit = !!id;
  const r = isEdit ? Store.getRecipe(id) : null;
  const title = isEdit ? "编辑菜谱" : "新建菜谱";

  let coverHTML = `<div class="cover-upload" id="cover-area">
    <span style="font-size:24px">📷</span>
    <span style="font-size:13px">添加封面图片</span>
    <input type="file" class="file-input" id="cover-input" accept="image/*">
  </div>`;

  if (isEdit && r && r.cover) {
    coverHTML = `<div class="cover-upload has-img" id="cover-area">
      <img src="${r.cover}" alt="">
      <button class="del" id="cover-del">✕</button>
      <input type="file" class="file-input" id="cover-input" accept="image/*">
    </div>`;
  }

  let catHTML = CATEGORIES.map(c => {
    const sel = isEdit && r && (r.categories || []).includes(c.name) ? " active" : "";
    return `<button class="chip${sel}" data-cat="${c.name}">${c.emoji} ${c.name}</button>`;
  }).join("");

  let ingHTML = "";
  const ings = (isEdit ? (r.ingredients || []) : [{ name: "", quantity: "1", unit: "", essential: true, note: "" }]);
  ings.forEach((ing, i) => {
    ingHTML += ingEditorRow(i, ing);
  });

  let stepHTML = "";
  const steps = (isEdit ? (r.steps || []) : [{ instruction: "", minutes: 0, image: "" }]);
  steps.forEach((s, i) => {
    stepHTML += stepEditorRow(i, s);
  });

  let html = `<div class="view view--notab">
    <div class="topbar">
      <button class="topbar__back" onclick="router.go('${isEdit ? "/recipe/" + id : "/recipes"}')">‹</button>
      <div class="topbar__title">${title}</div>
      <button style="font-weight:600;color:var(--accent);font-size:16px" onclick="saveRecipe('${id || ""}')">保存</button>
    </div>

    <div class="section__head" style="margin-top:6px"><span class="em">📖</span>基础信息</div>
    ${coverHTML}
    <div class="field" style="margin-top:14px">
      <label>菜名（必填）</label>
      <input type="text" id="rf-name" value="${isEdit ? esc(r.name) : ""}" placeholder="例如：番茄炒鸡蛋">
    </div>
    <div class="row2">
      <div class="field">
        <label>难度</label>
        <select id="rf-diff">
          ${DIFFICULTIES.map(d => `<option value="${d.value}"${isEdit && r.difficulty === d.value ? " selected" : ""}>${d.label}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>份数</label>
        <input type="number" id="rf-servings" value="${isEdit ? r.servings : 2}" min="1">
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>准备时间（分钟）</label>
        <input type="number" id="rf-prep" value="${isEdit ? r.prepMinutes : 5}" min="0">
      </div>
      <div class="field">
        <label>烹饪时间（分钟）</label>
        <input type="number" id="rf-cook" value="${isEdit ? r.cookMinutes : 15}" min="0">
      </div>
    </div>
    <div class="field">
      <label>简介（可选）</label>
      <textarea id="rf-summary" rows="3">${isEdit ? esc(r.summary) : ""}</textarea>
    </div>
    <div class="field">
      <label>分类</label>
      <div class="chips">${catHTML}</div>
    </div>

    <div class="section__head"><span class="em">🥕</span>食材</div>
    <div id="rf-ingredients">${ingHTML}</div>
    <button class="add-row" onclick="addIngredient()">＋ 添加食材</button>

    <div class="section__head"><span class="em">📋</span>制作步骤</div>
    <div id="rf-steps">${stepHTML}</div>
    <button class="add-row" onclick="addStep()">＋ 添加步骤</button>

    <div class="section__head"><span class="em">💡</span>烹饪小贴士</div>
    <div class="field">
      <textarea id="rf-tip" rows="3" placeholder="例如：炒糖色用小火，否则容易发苦……">${isEdit ? esc(r.tip) : ""}</textarea>
    </div>

    ${isEdit ? `<button class="btn btn--danger" style="margin-top:20px;width:100%" onclick="showDialog('删除这道菜？','删除后无法恢复。',()=>{Store.deleteRecipe('${id}');router.go('/recipes');toast('已删除')},'删除')">🗑️ 删除这道菜谱</button>` : ""}
  </div>`;

  return html;
}

function ingEditorRow(i, ing) {
  return `<div class="editor" data-ing-idx="${i}">
    <div class="ing-line">
      <input type="text" class="ing-name" value="${esc(ing.name)}" placeholder="食材名称">
      <input type="text" class="ing-qty" value="${ing.quantity}" placeholder="数量">
      <input type="text" class="ing-unit" value="${esc(ing.unit)}" placeholder="单位">
    </div>
    <div class="ing-tools">
      <label class="check"><input type="checkbox" class="ing-essential"${ing.essential !== false ? " checked" : ""}> 必需</label>
      <input type="text" class="ing-note" value="${esc(ing.note)}" placeholder="备注（可选）" style="flex:1;border:1px solid var(--sep);border-radius:8px;padding:8px;background:var(--bg);font-size:13px">
      <button class="editor__del" onclick="this.closest('.editor').remove()">✕</button>
    </div>
  </div>`;
}

function stepEditorRow(i, step) {
  const img = step.image ? `<img src="${step.image}" style="width:52px;height:52px;border-radius:8px;object-fit:cover">` : "";
  return `<div class="editor" data-step-idx="${i}">
    <div class="editor__head">
      <div class="editor__num">${i + 1}</div>
      <input type="text" class="step-instruction" value="${esc(step.instruction)}" placeholder="输入这一步要做什么……" style="flex:1;border:1px solid var(--sep);border-radius:8px;padding:10px;background:var(--bg);font-size:14px">
      <button class="editor__del" onclick="this.closest('.editor').remove()">✕</button>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <span style="font-size:13px;color:var(--text2)">⏱</span>
      <input type="number" class="step-minutes" value="${step.minutes || 0}" min="0" style="width:52px;border:1px solid var(--sep);border-radius:8px;padding:8px;background:var(--bg);font-size:13px">
      <span style="font-size:13px;color:var(--text2)">分钟</span>
      <span style="flex:1"></span>
      <label class="step-img-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--accent)">
        <span>📷</span> 图片
        <input type="file" accept="image/*" class="file-input step-img-input" style="display:none">
      </label>
      ${img ? `<span class="step-img-preview" style="display:flex;align-items:center;gap:6px">${img}<button onclick="this.closest('.step-img-preview').remove()" style="color:var(--text2);font-size:13px">✕</button></span>` : ""}
    </div>
  </div>`;
}

/* 全局状态 */
let formIngCount = 0;
let formStepCount = 0;

window.addIngredient = function () {
  const div = document.getElementById("rf-ingredients");
  const i = div.children.length;
  div.insertAdjacentHTML("beforeend", ingEditorRow(i, { name: "", quantity: "1", unit: "", essential: true, note: "" }));
};
window.addStep = function () {
  const div = document.getElementById("rf-steps");
  const i = div.children.length;
  div.insertAdjacentHTML("beforeend", stepEditorRow(i, { instruction: "", minutes: 0, image: "" }));
  renumberSteps();
};
function renumberSteps() {
  const steps = document.querySelectorAll("#rf-steps .editor");
  steps.forEach((el, i) => {
    el.querySelector(".editor__num").textContent = i + 1;
  });
}

/* 保存 */
window.saveRecipe = async function (id) {
  const name = document.getElementById("rf-name").value.trim();
  if (!name) { toast("请填写菜名"); return; }

  const summary = document.getElementById("rf-summary").value.trim();
  const diff = document.getElementById("rf-diff").value;
  const servings = parseInt(document.getElementById("rf-servings").value, 10) || 2;
  const prep = parseInt(document.getElementById("rf-prep").value, 10) || 0;
  const cook = parseInt(document.getElementById("rf-cook").value, 10) || 0;
  const tip = document.getElementById("rf-tip").value.trim();

  const categories = [];
  document.querySelectorAll(".chip[data-cat].active").forEach(c => categories.push(c.dataset.cat));

  // cover
  let cover = null;
  const coverArea = document.getElementById("cover-area");
  if (coverArea && coverArea.dataset.cover) cover = coverArea.dataset.cover;

  // ingredients
  const ingredients = [];
  document.querySelectorAll(".editor[data-ing-idx]").forEach(el => {
    const name = el.querySelector(".ing-name").value.trim();
    if (!name) return;
    ingredients.push({
      name,
      quantity: parseFloat(el.querySelector(".ing-qty").value) || 1,
      unit: el.querySelector(".ing-unit").value.trim(),
      essential: el.querySelector(".ing-essential").checked,
      note: el.querySelector(".ing-note").value.trim()
    });
  });

  // steps
  const steps = [];
  document.querySelectorAll(".editor[data-step-idx]").forEach(el => {
    const instruction = el.querySelector(".step-instruction").value.trim();
    if (!instruction) return;
    let image = "";
    const preview = el.querySelector(".step-img-preview img");
    if (preview) image = preview.src;
    steps.push({
      instruction,
      minutes: parseInt(el.querySelector(".step-minutes").value, 10) || 0,
      image
    });
  });

  const data = { name, summary, cover, prepMinutes: prep, cookMinutes: cook, difficulty: diff, servings, tip, categories, ingredients, steps };

  if (id) {
    Store.updateRecipe(id, data);
    toast("已保存");
    router.go("/recipe/" + id);
  } else {
    const newRecipe = Store.addRecipe(data);
    toast("已新建");
    router.go("/recipe/" + newRecipe.id);
  }
};

/* 封面图片上传 */
document.addEventListener("change", async function (e) {
  const input = e.target.closest("#cover-input");
  if (!input) return;
  const file = input.files[0];
  if (!file) return;
  try {
    const dataUrl = await compressImage(file, 1280, 0.8);
    const area = document.getElementById("cover-area");
    area.innerHTML = `<img src="${dataUrl}" alt=""><button class="del" id="cover-del">✕</button><input type="file" class="file-input" id="cover-input" accept="image/*">`;
    area.classList.add("has-img");
    area.dataset.cover = dataUrl;
    toast("封面已添加");
  } catch (e) { toast("图片加载失败"); }
});

document.addEventListener("click", function (e) {
  // 点击封面区域触发文件选择（排除删除按钮）
  const coverArea = e.target.closest(".cover-upload");
  if (coverArea && !e.target.closest(".del")) {
    const input = coverArea.querySelector("input[type=file]");
    if (input) input.click();
    return;
  }

  const del = e.target.closest("#cover-del");
  if (del) {
    const area = document.getElementById("cover-area");
    area.innerHTML = `<span style="font-size:24px">📷</span><span style="font-size:13px">添加封面图片</span><input type="file" class="file-input" id="cover-input" accept="image/*">`;
    area.classList.remove("has-img");
    delete area.dataset.cover;
    return;
  }

  // 分类选择
  const chip = e.target.closest(".chip[data-cat]");
  if (chip) {
    chip.classList.toggle("active");
  }
});

/* 步骤图片上传 */
document.addEventListener("change", async function (e) {
  const input = e.target.closest(".step-img-input");
  if (!input) return;
  const file = input.files[0];
  if (!file) return;
  try {
    const dataUrl = await compressImage(file, 800, 0.7);
    const editor = input.closest(".editor");
    const existing = editor.querySelector(".step-img-preview");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.className = "step-img-preview";
    div.style.cssText = "display:flex;align-items:center;gap:6px";
    div.innerHTML = `<img src="${dataUrl}" style="width:52px;height:52px;border-radius:8px;object-fit:cover"><button onclick="this.closest('.step-img-preview').remove()" style="color:var(--text2);font-size:13px">✕</button>`;
    editor.querySelector(".step-img-label").after(div);
  } catch (e) { toast("图片加载失败"); }
});