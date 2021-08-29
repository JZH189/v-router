export default {
  name: "RouterView",
  functional: true,
  props: {
    name: {
      type: String,
      default: "default",
    },
  },
  //使用render来生成虚拟dom。在vnode = render.call(vm._renderProxy, vm.$createElement),  定义在vue源码目录： src/core/instance/render.js
  //因此，render函数的第一个参数就是createElement函数（h）
  // vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
  //此处使用了解构：render(h, { props, children, parent, data }) === render(h, context)
  // render(h, { props, children, parent, data }) {
  render(h, { props, parent, data }) {
    //组件需要的一切都是通过 context 参数传递
    const name = props.name;
    const route = parent.$route;
    const depth = 0; //不考虑嵌套路由
    const matched = route.matched[depth];
    const component = matched && matched.components[name];
    if (component) {
      matched.instances[name] = component;
    }

    return h(component, data);
  },
};
