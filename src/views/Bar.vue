<template>
  <h1>bar</h1>
</template>

<script>
export default {
  name: "bar",
  beforeRouteEnter(to, from, next) {
    console.log('bar 组件内的守卫：beforeRouteEnter');
    // 在渲染该组件的对应路由被 confirm 前调用
    // 不！能！获取组件实例 `this`
    // 因为当守卫执行前，组件实例还没被创建
    next(vm => {
      // 通过 `vm` 访问组件实例
      console.log('vm: ', vm);
    })
  },
  beforeRouteLeave(to, from, next) {
    console.log('bar 组件内的守卫：beforeRouteLeave');
    // 导航离开该组件的对应路由时调用
    // 可以访问组件实例 `this`
    next()
  }
};
</script>

<style></style>
