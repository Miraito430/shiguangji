/* 食光记 · 数据持久化层（localStorage） */
"use strict";

const KEYS = { recipes: "sgj_recipes", inventory: "sgj_inventory", shopping: "sgj_shopping", seedVersion: "sgj_seed_version" };
const SEED_VERSION = 2;

const Store = {
  _init: false,

  /* 首次启动载入示例数据 */
  init() {
    if (this._init) return;
    this._init = true;
    try {
      const r = localStorage.getItem(KEYS.recipes);
      const seed = seedRecipes();
      if (!r) {
        this.save(KEYS.recipes, seed);
      } else if (Number(localStorage.getItem(KEYS.seedVersion) || 0) < SEED_VERSION) {
        const recipes = this.load(KEYS.recipes);
        const existingNames = new Set(recipes.map(recipe => recipe.name));
        this.save(KEYS.recipes, recipes.concat(seed.filter(recipe => !existingNames.has(recipe.name))));
      }
      localStorage.setItem(KEYS.seedVersion, String(SEED_VERSION));
      // 清理旧版在线菜谱功能曾保存的凭证。
      localStorage.removeItem("sgj_juhe_key");
    } catch (e) { /* localStorage 不可用 */ }
  },

  load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      toast("存储空间不足，已尝试清理旧数据");
      // 尝试清理
      try {
        const old = this.load(key);
        if (old.length > 50) { this.save(key, old.slice(-50)); }
      } catch (_) {}
    }
  },

  /* ---- 菜谱 ---- */
  getRecipes() { return this.load(KEYS.recipes); },
  saveRecipes(r) { this.save(KEYS.recipes, r); },

  getRecipe(id) {
    return this.getRecipes().find(r => r.id === id) || null;
  },

  addRecipe(recipe) {
    const recipes = this.getRecipes();
    recipe.id = "r" + Date.now() + Math.random().toString(36).slice(2, 6);
    if (!recipe.createdAt) recipe.createdAt = Date.now();
    recipe.updatedAt = Date.now();
    recipes.push(recipe);
    this.saveRecipes(recipes);
    return recipe;
  },

  updateRecipe(id, data) {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    Object.assign(recipes[idx], data, { updatedAt: Date.now() });
    this.saveRecipes(recipes);
    return recipes[idx];
  },

  deleteRecipe(id) {
    let recipes = this.getRecipes();
    const removed = recipes.find(r => r.id === id);
    recipes = recipes.filter(r => r.id !== id);
    this.saveRecipes(recipes);
    return removed;
  },

  toggleFavorite(id) {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    recipes[idx].isFavorite = !recipes[idx].isFavorite;
    recipes[idx].updatedAt = Date.now();
    this.saveRecipes(recipes);
    return recipes[idx];
  },

  recordCooked(id) {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    recipes[idx].lastCookedAt = Date.now();
    recipes[idx].cookCount = (recipes[idx].cookCount || 0) + 1;
    this.saveRecipes(recipes);
    return recipes[idx];
  },

  /* ---- 食材库存 ---- */
  getInventory() { return this.load(KEYS.inventory); },
  saveInventory(arr) { this.save(KEYS.inventory, arr); },

  addInventory(item) {
    const canonical = item.name.trim().toLowerCase();
    const list = this.getInventory();
    const existing = list.find(i => i.name.trim().toLowerCase() === canonical);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 1);
      if (item.unit) existing.unit = item.unit;
      if (item.expireDate) existing.expireDate = item.expireDate;
      this.saveInventory(list);
      return existing;
    }
    item.id = "i" + Date.now() + Math.random().toString(36).slice(2, 4);
    list.push(item);
    this.saveInventory(list);
    return item;
  },

  updateInventory(id, data) {
    const list = this.getInventory();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    Object.assign(list[idx], data);
    this.saveInventory(list);
    return list[idx];
  },

  deleteInventory(id) {
    let list = this.getInventory();
    list = list.filter(i => i.id !== id);
    this.saveInventory(list);
  },

  /* ---- 购物清单 ---- */
  getShopping() { return this.load(KEYS.shopping); },
  saveShopping(arr) { this.save(KEYS.shopping, arr); },

  addShopping(item) {
    item.id = "s" + Date.now() + Math.random().toString(36).slice(2, 4);
    if (!item.createdAt) item.createdAt = Date.now();
    item.isCompleted = false;
    const list = this.getShopping();
    list.push(item);
    this.saveShopping(list);
    return item;
  },

  toggleShopping(id) {
    const list = this.getShopping();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx].isCompleted = !list[idx].isCompleted;
    this.saveShopping(list);
    return list[idx];
  },

  deleteShopping(id) {
    let list = this.getShopping();
    list = list.filter(i => i.id !== id);
    this.saveShopping(list);
  },

  clearCompletedShopping() {
    let list = this.getShopping();
    const count = list.filter(i => i.isCompleted).length;
    list = list.filter(i => !i.isCompleted);
    this.saveShopping(list);
    return count;
  },

  /* ---- 重置 ---- */
  resetAll() {
    localStorage.removeItem(KEYS.recipes);
    localStorage.removeItem(KEYS.inventory);
    localStorage.removeItem(KEYS.shopping);
    localStorage.removeItem(KEYS.seedVersion);
    this._init = false;
    this.init();
  },

  restoreSeeds() {
    const seed = seedRecipes();
    this.save(KEYS.recipes, seed);
    this.save(KEYS.inventory, []);
    this.save(KEYS.shopping, []);
    localStorage.setItem(KEYS.seedVersion, String(SEED_VERSION));
  }
};
