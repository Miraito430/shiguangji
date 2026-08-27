/* 食光记 · 启动 */
"use strict";

(function () {
  Store.init();

  /* 注册路由 */
  router.on(/^\/$/, () => viewHome());
  router.on(/^\/recipes/, () => viewRecipes(parseQuery(window.location.hash.split("?")[1])));
  router.on(/^\/recipe\/([^/]+)\/edit/, (m) => viewRecipeForm(m[1]));
  router.on(/^\/recipe\/([^/]+)/, (m) => viewRecipeDetail(m[1]));
  router.on(/^\/new/, () => viewRecipeForm(null));
  router.on(/^\/cook\/([^/]+)/, (m) => viewCook(m[1]));
  router.on(/^\/favorites/, () => viewRecipes({ fav: "1" }));
  router.on(/^\/inventory/, () => viewInventory());
  router.on(/^\/match/, () => viewMatch());
  router.on(/^\/shopping/, () => viewShopping());
  router.on(/^\/settings/, () => viewSettings());

  router.notFound(() => viewHome());

  /* 首次渲染 */
  render(router._resolve(window.location.hash));

  /* 底部 Tab 点击 */
  setupTabBar();

  /* 记录当前烹饪菜谱 id */
  window.addEventListener("hashchange", () => {
    const m = (window.location.hash || "").match(/^#\/cook\/([^/]+)/);
    if (m) App.lastCookId = m[1];
    scrollToTop();
  });
  const firstCook = (window.location.hash || "").match(/^#\/cook\/([^/]+)/);
  if (firstCook) App.lastCookId = firstCook[1];

  /* 底部 Tab 高亮 */
  const syncTab = () => {
    const path = (window.location.hash || "").replace(/^#/, "") || "/";
    updateTabBar(activeTabIndex(path));
  };
  window.addEventListener("hashchange", syncTab);
  syncTab();

  /* 注册 Service Worker（仅 https / localhost 有效） */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
