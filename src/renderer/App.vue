<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: "thief-book"
};
</script>

<style>
html,
body {
  margin: 0px;
  height: 100%;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  overflow-y: hidden;
  overflow-x: hidden;
}

#app {
  height: 100%;
}
</style>
