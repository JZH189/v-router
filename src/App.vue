<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <p>
      <!-- <router-link to="foo" append>Go to Foo</router-link> -->
      <router-link to="/foo">/foo</router-link>
      <!-- <router-link :to="{ name: 'foo', params: { plan: 'private' }}">Go to Foo</router-link> -->
      <!-- <router-link :to="{ path: `foo/bar?plan=private` }">Go to Foo</router-link> -->
      <!-- <router-link :to="{ path: 'foo', query: { plan: 'private' } }">Go to Foo</router-link> -->
      <!-- <router-link :to="{ path: '/foo', params: { plan: 'private' }}">Go to Foo</router-link> 不支持 -->
      <router-link to="/bar">/bar</router-link>
      <router-link to="/baz/1">/baz/1</router-link>
      <router-link to="/baz/2">/baz/2</router-link>
    </p>
    <router-view></router-view>
  </div>
</template>

<script>

export default {
  name: 'App',
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
a {
  margin:20px;
}
</style>
