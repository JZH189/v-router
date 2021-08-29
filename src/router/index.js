import Vue from "vue";
import VueRouter from "@/vRouter/";
import Foo from "../views/Foo.vue";
import Baz from "../views/Baz.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/foo",
    name: "foo",
    component: Foo,
    beforeEnter: (to, from, next) => {
      console.log("在路由配置里调用 beforeEnter, 来自foo");
      next();
    },
  },
  {
    path: "/bar",
    name: "bar",
    //动态引入，并且我们可以给当前路由指定一个 chunkName
    component: () => import(/* webpackChunkName: 'bar' */ "../views/Bar.vue"),
    beforeEnter: (to, from, next) => {
      console.log("在路由配置里调用 beforeEnter, 来自bar");
      next();
    },
  },
  {
    path: "/baz/:id",
    component: Baz,
    beforeEnter: (to, from, next) => {
      console.log("在路由配置里调用 beforeEnter, 来自bar");
      next();
    },
  },
];

let router = new VueRouter({
  routes,
});

router.beforeEach((to, from, next) => {
  console.log("全局前置守卫：beforeEach");
  next();
});

router.beforeResolve((to, from, next) => {
  //在导航被确认之前，同时在所有组件内守卫和异步路由组件被解析之后，解析守卫就被调用。
  console.log("全局解析守卫：beforeResolve");
  next();
});

router.afterEach((to, from) => {
  console.log("全局后置钩子：afterEach");
});
export default router;
