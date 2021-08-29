import { pathToRegexp } from "path-to-regexp";

export function createRouteMap(
  routes, //用户路由配置
  oldPathList,
  oldPathMap,
  oldNameMap,
  parentRoute
) {
  //为什么使用Object.create(null)来创建一个对象而不是 {} 呢？
  //因为Object.create(null)创建的对象没有多余的属性，他是一个“干净”的对象，
  //当我们使用for..in循环的时候就只会遍历到自己定义过的属性。
  const pathList = oldPathList || [];
  const pathMap = oldPathMap || Object.create(null);
  const nameMap = oldNameMap || Object.create(null);

  //循环路由配置表添加路由记录
  routes.forEach((route) => {
    addRouteRecord(pathList, pathMap, nameMap, route, parentRoute);
  });

  return {
    pathList,
    pathMap,
    nameMap,
  };
}

function addRouteRecord(pathList, pathMap, nameMap, route, parent) {
  const { path, name } = route;

  const normalizedPath = normalizePath(path, parent);
  const regexPath = pathToRegexp(normalizedPath);
  const record = {
    path: normalizedPath,
    regex: regexPath,
    components: route.components || { default: route.component }, //平时我们其实用的default
    beforeEnter: route.beforeEnter, //路由独享的守卫
    instances: {},
    enteredCbs: {}, //保存 beforeRouteEnter 钩子回调
    name,
    parent,
    meta: route.meta || {},
  };
  if (route.children) {
    route.children.forEach((child) => {
      addRouteRecord(pathList, pathMap, nameMap, child, record);
    });
  }

  if (!pathMap[record.path]) {
    pathList.push(record.path);
    pathMap[record.path] = record;
  }
  if (name) {
    if (!nameMap[name]) {
      nameMap[name] = record;
    }
  }
}

function normalizePath(path, parent) {
  path = path.replace(/\/$/, "");
  if (path[0] === "/") return path;
  if (parent == null) return path;
  //父路由与子路由拼接的时候去掉多余的"/"
  return `${parent.path}/${path}`.replace(/\/\//g, "/");
}
