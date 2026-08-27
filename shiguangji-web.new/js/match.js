/* 食光记 · “我能做什么”本地匹配算法（与原生版同款） */
"use strict";

const MATCH = {

  /* 同义词归一化表 */
  synonyms: {
    "鸡蛋": "蛋", "蛋": "蛋",
    "番茄": "番茄", "西红柿": "番茄",
    "土豆": "土豆", "马铃薯": "土豆",
    "小葱": "葱", "香葱": "葱", "葱花": "葱", "大葱": "葱", "葱": "葱",
    "蒜": "蒜", "大蒜": "蒜", "蒜瓣": "蒜", "蒜末": "蒜",
    "姜": "姜", "生姜": "姜", "姜片": "姜",
    "油": "油", "食用油": "油", "菜籽油": "油", "花生油": "油", "橄榄油": "油", "植物油": "油",
    "盐": "盐", "食盐": "盐", "海盐": "盐", "细盐": "盐",
    "糖": "糖", "白糖": "糖", "冰糖": "糖", "砂糖": "糖", "红糖": "糖",
    "酱油": "酱油", "生抽": "酱油", "老抽": "酱油", "生抽酱油": "酱油",
    "蚝油": "蚝油",
    "鸡翅": "鸡翅", "鸡翅中": "鸡翅", "鸡翅根": "鸡翅",
    "猪肉": "猪肉", "五花肉": "猪肉", "猪五花": "猪肉",
    "西兰花": "西兰花", "西蓝花": "西兰花", "绿花菜": "西兰花",
    "胡椒": "胡椒", "黑胡椒": "胡椒", "白胡椒粉": "胡椒", "黑胡椒粉": "胡椒",
    "米": "米", "大米": "米", "米饭": "米",
    "牛肉": "牛肉", "牛排": "牛肉",
    "虾": "虾", "虾仁": "虾",
    "鸡": "鸡", "鸡肉": "鸡",
    "牛奶": "牛奶",
    "紫菜": "紫菜",
    "虾皮": "虾皮"
  },

  canonical(name) {
    const n = (name || "").trim().toLowerCase();
    return this.synonyms[n] || n;
  },

  /* 计算单个菜谱匹配 */
  match(recipe, inventoryNames) {
    const have = new Set((inventoryNames || []).map(n => this.canonical(n)));
    const items = (recipe.ingredients || []).map(i => this.canonical(i.name));
    let matched = 0;
    const missing = [];
    const seen = new Set();
    for (const item of items) {
      if (have.has(item)) matched++;
      else if (!seen.has(item)) { seen.add(item); missing.push(item); }
    }
    const total = items.length;
    const ratio = total === 0 ? 0 : matched / total;
    return { recipe, matched, total, missing, ratio };
  },

  /* 全部匹配，按匹配度降序 */
  matches(recipes, inventoryNames) {
    return recipes
      .map(r => this.match(r, inventoryNames))
      .filter(m => m.total > 0)
      .sort((a, b) => b.ratio - a.ratio || totalMinutes(a.recipe) - totalMinutes(b.recipe));
  }
};