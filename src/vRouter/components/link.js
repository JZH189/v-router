export default {
  name: "RouterLink",
  props: {
    //表示目标路由的链接。当被点击后，内部会立刻把 to 的值传到 router.push()，所以这个值可以是一个字符串或者是描述目标位置的对象。
    to: {
      type: [String, Object],
      required: true,
    },
    tag: {
      type: String,
      default: "a",
    },
    event: {
      type: String,
      default: "click",
    },
    //设置 append 属性后，则在当前 (相对) 路径前添加基路径。例如，我们从 /a 导航到一个相对路径 b，如果没有配置 append，则路径为 /b，如果配了，则为 /a/b
    append: {
      type: Boolean,
      default: false,
    },
  },
  render(h) {
    //由于我们在注册插件的时候在Vue.prototype上设置了$router和$route,所以我们在组件内部可以通过this.$router和this.$route的方式拿到路由实例和当前的路由线路。
    const router = this.$router
    const current = this.$route
    //通过Vue-router的resolve方法拿到目标 location和href
    const { location, href } = router.resolve(
      this.to,
      current,
      this.append
    );
    
    //重新覆写 router-link 组件的点击事件
    const handler = (e) => {
      if (guardEvent(e)) {
        if (this.replace) {
          router.replace(location)
        } else {
          router.push(location)
        }
      }
    };

    const on = { 
      click: guardEvent,
      [this.event] : handler,
    }

    const data = {}

    if (this.tag === "a") {
      data.on = on;
      data.attrs = { href };
    } else {
      //todo else
    }
    return h(this.tag, data, this.$slots.default);
  },
};

//设置一个点击事件的守卫用来取消点击事件的执行
function guardEvent(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  return true;
}