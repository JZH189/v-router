import View from "./components/view";
import Link from "./components/link";

export let _Vue;

export function install(Vue) {
  if (install.installed && _Vue === Vue) return;
  //避免重复安装
  install.installed = true;
  //保存vue，因为后面需要使用Vue提供的api
  _Vue = Vue;

  const isDef = (v) => v !== undefined;

  Vue.mixin({
    beforeCreate() {
      if (isDef(this.$options.router)) {
        //将 _routerRoot 设置为自己
        this._routerRoot = this;
        //将VueRouter实例挂载到Vue._router
        this._router = this.$options.router;
        //初始化VueRouter
        this._router.init(this);
        //把_route变成响应式
        Vue.util.defineReactive(this, "_route", this._router.history.current);
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
      }
    },
  });

  /**
   * 注意：通过Object.defineProperty设置到Vue的原型上可以避免他人无意当中修改掉
   * 通过在Vue的原型上定义了$router、$route之后我们就可以在组件中调用 this.$router 和 this.$route 啦！
   */
  Object.defineProperty(Vue.prototype, "$router", {
    get() {
      return this._routerRoot._router;
    },
  });
  Object.defineProperty(Vue.prototype, "$route", {
    get() {
      return this._routerRoot._route;
    },
  });

  Vue.component("RouterView", View);
  Vue.component("RouterLink", Link);
}
