import { cleanPath } from "./util/path";
import { createMatcher } from "./create-matcher";
import { install } from "./install";
import { HashHistory } from "./history/hash";
import { normalizeLocation } from "./util/location";

export default class VueRouter {
  constructor(options = {}) {
    //获取用户传入的配置
    this.options = options;
    // this.app 表⽰根 Vue 实例
    this.app = null;
    //this.apps 保存所有⼦组件的 Vue 实例
    this.apps = [];
    // 用于储存三个全局钩子函数的数组
    this.beforeHooks = [];
    this.resolveHooks = [];
    this.afterHooks = [];
    //createMatcher函数返回一个对象 {match, addRoutes, getRoutes, addRoutes}
    this.matcher = createMatcher(options.routes || [], this);
    this.mode = options.mode || "hash";
    //实现不同模式下的前端路由
    switch (this.mode) {
      case "hash":
        this.history = new HashHistory(this, options.base);
        break;
      default:
        return new Error(`invalid mode: ${this.mode}`);
    }
  }

  match(raw, current) {
    return this.matcher.match(raw, current);
  }

  push(location, onComplete) {
    this.history.push(location, onComplete);
  }

  replace(location, onComplete) {
    this.history.replace(location, onComplete);
  }

  init(app) {
    this.apps.push(app);
    //设置一个钩子函数，在组件销毁的时候取消组件的时间监听函数，释放内存
    app.$once("hook:destroyed", () => {
      const index = this.apps.indexOf(app);
      if (index > -1) this.apps.splice(index, 1);
      if (this.app === app) this.app = this.apps[0] || null;
      if (!this.app) this.history.teardown();
    });

    // 只有根Vue实例会保存到this.app
    if (this.app) {
      return;
    }
    //保存 Vue 实例
    this.app = app;
    const history = this.history;
    // if (history instanceof HTML5History || history instanceof HashHistory) {
    if (history instanceof HashHistory) {
      //添加路由事件监听函数
      const setupListeners = () => {
        history.setupListeners();
      };
      //执行路由过渡
      history.transitionTo(history.getCurrentLocation(), setupListeners);
    }

    /**
     * 注册一个函数并且这个函数接收一个 currentRoute 作为参数。
     * 每次切换路由的时候就执行 vue._route = currentRoute 。
     * 这样每个vue组件实例都能拿到currentRoute，并及时更新视图
     */
    history.listen((route) => {
      this.apps.forEach((app) => {
        // 更新app上的_route
        app._route = route;
      });
    });
  }

  //全局前置守卫
  beforeEach(fn) {
    return registerHook(this.beforeHooks, fn);
  }

  //全局解析守卫
  beforeResolve(fn) {
    return registerHook(this.resolveHooks, fn);
  }

  //全局后置钩子
  afterEach(fn) {
    return registerHook(this.afterHooks, fn);
  }

  resolve(to, current, append) {
    current = current || this.history.current;
    const location = normalizeLocation(to, current, append, this);
    const route = this.match(location, current);
    const fullPath = route.redirectedFrom || route.fullPath;
    const base = this.history.base;
    const href = createHref(base, fullPath, this.mode);
    return {
      location,
      route,
      href,
      normalizedTo: location,
      resolved: route,
    };
  }
}

function createHref(base, fullPath, mode) {
  var path = mode === "hash" ? "#" + fullPath : fullPath;
  return base ? cleanPath(base + "/" + path) : path;
}

function registerHook(list, fn) {
  list.push(fn);
  return () => {
    //等待调用的时候从中取出
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
}

VueRouter.install = install;
