# 手写vue-router源码系列二：实现 matcher

这是我参与8月更文挑战的第2天，活动详情查看：[8月更文挑战](https://juejin.cn/post/6987962113788493831)

## 前言
今天我们来实现下 vue-router 中的重点之一 matcher 。

vue-router 的 matcher 实现了一些非常重要的API:
- match()     根据传入的路由和当前的路由计算出新的路由。
- addRoutes()  可以动态添加更多的路由规则。已废弃：官方建议使用 router.addRoute() 代替。
- addRoute()   添加一条新的路由规则。
- getRoutes()  获取所有活跃的路由记录列表。

使用router-link可以实现跳转到指定路由界面,但是我们如何知道哪个 URL 对应的 View 的具体内容是什么呢? 换句话说就是如何将 URL 与 View 关联起来呢?即建立 URL 与 View 的映射关系。如果我们知道了这个对应关系，那么在 URL 变化的时候我们只需要更新对应的视图内容就可以了。这就是 matcher.match 的作用啦！


我们给 VueRouter 这个类新增一个 matcher：

```js
//新增的代码
import { createMatcher } from './create-matcher'
import { install } from "./install";
import { HashHistory } from "./history/hash";

export default class VueRouter {
  constructor(options = {}) {
    //获取用户传入的配置
    this.options = options;
    // this.app 表⽰根 Vue 实例
    this.app = null;
    //this.apps 保存所有⼦组件的 Vue 实例
    this.apps = []; 
    //新增的代码  
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

  //新增的代码
  match(raw, current, redirectedFrom) {
    return this.matcher.match(raw, current, redirectedFrom);
  }

  init(app) {
    this.apps.push(app);
    // 只有根Vue实例会保存到this.app
    if (this.app) {
      return;
    }
    //保存 Vue 实例
    this.app = app;

    const history = this.history;
    if (history instanceof HashHistory) {
      //添加路由事件监听函数
      const setupListeners = () => {
        history.setupListeners();
      };
      //执行路由过渡
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners
      );
    }
  }
}
VueRouter.install = install;
```

## createMatcher

createMatcher是一个工厂函数，通过调用它会得到 match, addRoutes, getRoutes，addRoutes等方法。

新建create-matcher.js

```js
//src/vRouter/create-matcher.js

export function createMatcher(routes, router) {

  // addRoutes ⽅法用来动态添加更多的路由规则。参数必须是一个符合 routes 选项要求的数组。
  function addRoutes(routes) {}

  //添加一条新路由规则。如果该路由规则有 name，并且已经存在一个与之相同的名字，则会覆盖它。
  function addRoute(parentOrRoute, route) {}

  //返回pathMap
  function getRoutes() {}

  function match(raw, currentRoute) {}

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes,
  };
}

```

## createRouteMap
createMatcher 方法中还用到了 createRouteMap 函数。createRouteMap 的作用就是把⽤户的路由配置转换成⼀张路由映射表，然后我们就可以根据用户定义的路由 name 或者 path 去做匹配规则。

```js
//src/vRouter/create-matcher.js

import { createRouteMap } from "./create-route-map";

export function createMatcher(routes, router) {
  //新增
  const { pathList, pathMap, nameMap } = createRouteMap(routes);
  // addRoutes ⽅法用来动态添加更多的路由规则。参数必须是一个符合 routes 选项要求的数组。
  function addRoutes(routes) {}

  //添加一条新路由规则。如果该路由规则有 name，并且已经存在一个与之相同的名字，则会覆盖它。
  function addRoute(parentOrRoute, route) {}

  //返回pathMap
  function getRoutes() {}

  function match(raw, currentRoute) {}

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes,
  };
}
```

createRouteMap.js 

```js
// src/vRouter/create-route-map.js

//vue-router源码中使用 "path-to-regexp" 这个正则工具做的路径匹配。
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

```

## match
match ⽅法的作⽤是根据传⼊的 raw 和当前的路径 currentRoute 计算并且通过 createRoute 方法生成⼀个 URL 的描述对象（route），这个route对象包含了: name、path、query、params、hash 等等。说白了也就是通过当前 URL 匹配到的一个路由对象。

源码中的 match 方法还有第三个参数 redirectedFrom，他是和重定向相关的。为了更好的理清主线逻辑，我们在此忽略掉。

完善match方法
```js
// src/vRouter/create-matcher.js

import { createRoute } from "./util/route";
import { createRouteMap } from "./create-route-map";
import { normalizeLocation } from "./util/location";

export function createMatcher(routes, router) {
  //返回用户定义的路由配置映射
  const { pathList, pathMap, nameMap } = createRouteMap(routes);

  function addRoutes(routes) {}

  function addRoute(parentOrRoute, route) {}

  function getRoutes() {}

  function match(raw, currentRoute) {
    const location = normalizeLocation(raw, currentRoute, false, router);
    const { name } = location;

    //匹配路由对象带"name"的情况
    if (name) {
      const record = nameMap[name];
      if (!record) {
        console.warn(`Route with name '${name}' does not exist`);
        return _createRoute(null, location);
      }
      if (typeof location.params !== "object") {
        location.params = {};
      }
      return _createRoute(record, location);
    } else if (location.path) {
      //匹配路由对象带"path"的情况
      location.params = {};
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i];
        const record = pathMap[path];
        //使用location.regex规则去匹配location.path或者location.params
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location);
        }
      }
    }
    //_createRoute 会调用 createRoute 方法，createRoute 方法返回路由中的⼀条线路
    // 这条路由线路它除了描述了类似 Loctaion 的 path 、 query 、 hash 这 些概念，还有 matched 表⽰匹配到的所有的 RouteRecord 。
    return _createRoute(null, location);
  }

  function _createRoute(record, location) {
    return createRoute(record, location, router);
  }

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes,
  };
}
```
初次看 match 的时候花了很长时间，因为 match 方法内部的流程还是比较多的。初学者建议跟着源码打断点多跑几遍流程，这样才能加深理解。

我来分析下 match 的内部流程：
1. 调用 normalizeLocation 方法得到一个结构化的 location 对象
2. 如果 location里面包含 name 属性,使用 nameMap 去匹配 record
3. 如果 location里面包含 path 属性,使用 location.regex 去匹配 record
4. 最后调用 createRoute 方法生成一个被“冻结”的 route 对象，这个 route 就是当前匹配到的一个表示路由位置的对象。

## normalizeLocation

normalizeLocation ⽅法的作⽤是根据 raw 和 currentRoute 计算出新的 location 对象：{ _normalized: true, path, query, hash,}
举个例子： "/foo?foo=foo&bar=bar#hello" ,它的 path 是 /foo ， query 是 {foo:foo,bar:bar}

normalizeLocation 方法中还使用到了几个重要的方法：
- parsePath() 方法用于解析传入的path是否带查询参数等等，返回一个对象 { path, query, hash}
- resolvePath() 方法用于解析相对路径
- resolveQuery() 方法将 parsedPath.query 进一步加工并且返回 query对象

```js
// src/vRouter/util/location.js

import { parsePath, resolvePath } from "./path";
import { resolveQuery } from "./query";
import { extend } from "./misc";

export function normalizeLocation(raw, current, append) {
  //next 代表目标路由的对象 => { name: 'user', params: { userId: 123 }}
  // <router-link :to="{ name: 'user', params: { userId: 123 }}">User</router-link>

  let next = typeof raw === "string" ? { path: raw } : raw;
  if (next._normalized) {
    return next;
  } else if (next.name) {
    //处理raw带name的情况
    next = extend({}, raw);
    const params = next.params;
    if (params && typeof params === "object") {
      next.params = extend({}, params);
    }
    return next;
  }

  //解析传入的path是否带查询参数等等，返回一个对象 { path, query, hash}
  //例如： /foo?plan=private 这样的路径会得到 {hash: "", path: "/foo", query: "plan=private"}
  const parsedPath = parsePath(next.path || "");
  //基路径默认“/”
  const basePath = (current && current.path) || "/";
  //resolvePath 可以解析相对路径，
  const path = parsedPath.path
    ? resolvePath(parsedPath.path, basePath, append || next.append)
    : basePath;

  //resolveQuery 方法将 parsedPath.query 进一步加工并且返回 query对象
  const query = resolveQuery(parsedPath.query, next.query);

  let hash = next.hash || parsedPath.hash;
  if (hash && hash.charAt(0) !== "#") {
    hash = `#${hash}`;
  }

  return {
    _normalized: true,
    path,
    query,
    hash,
  };
}

```

resolvePath() 方法和 parsePath() 方法我都写了详细的注释，这里就不作另外的说明了。其实主要就是对 URL 的一些辅助处理函数。

```js
// src/vRouter/util/path.js

export function resolvePath(relative, base, append) {
  const firstChar = relative.charAt(0);
  if (firstChar === "/") {
    return relative;
  }
  if (firstChar === "?" || firstChar === "#") {
    return base + relative; // "/foo"
  }
  const stack = base.split("/"); //['', '']
  if (!append || !stack[stack.length - 1]) {
    stack.pop(); //['']
  }
  // 解析相对路径
  // 将“foo” =>  ["foo"]
  const segments = relative.replace(/^\//, "").split("/");
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "..") {
      stack.pop();
    } else if (segment !== ".") {
      stack.push(segment); // ["", "foo"]
    }
  }
  // 确保存在“/""
  if (stack[0] !== "") {
    stack.unshift("");
  }
  // ["", "foo"].join("/") => "/foo"
  return stack.join("/");
}

export function parsePath(path) {
  let hash = "";
  let query = "";

  const hashIndex = path.indexOf("#");
  if (hashIndex >= 0) {
    hash = path.slice(hashIndex);
    path = path.slice(0, hashIndex);
  }

  const queryIndex = path.indexOf("?");
  if (queryIndex >= 0) {
    query = path.slice(queryIndex + 1);
    path = path.slice(0, queryIndex);
  }

  return {
    path,
    query,
    hash,
  };
}

export function cleanPath(path) {
  return path.replace(/\/\//g, "/");
}

```

resolveQuery() 方法用来解析 URL 中的query参数。
例如："?plan=private&foo=bar"  将会生成一个 query 对象：{plan: private, foo: bar}

```js
// src/vRouter/util/query.js 

export function resolveQuery(query, extraQuery = {}) {
  //使用parseQuery方法来构造URL中的查询参数
  //例如：?plan=private&foo=bar  将会生成一个query对象：{plan: private, foo: bar}
  let parsedQuery = parseQuery(query || "");
  for (const key in extraQuery) {
    const value = extraQuery[key];
    parsedQuery[key] = Array.isArray(value)
      ? value.map(castQueryParamValue)
      : castQueryParamValue(value);
  }
  return parsedQuery;
}

//经过castQueryParamValue处理后，val的值类型将变成String。例如：[1,2,3] => ["1", "2", "3"]
const castQueryParamValue = (value) =>
  value == null || typeof value === "object" ? value : String(value);

function parseQuery(query) {
  //query = "?plan=private&foo=bar"
  const res = {};

  //去掉字符串开头的 ?|#|&
  query = query.trim().replace(/^(\?|#|&)/, "");

  if (!query) {
    return res;
  }
  //query = ["plan=private", "foo=bar"]
  query.split("&").forEach((param) => {
    //URL 中+号表示空格  "plan=private".split("=")  => ["plan", "private"]
    const parts = param.replace(/\+/g, " ").split("=");
    //弹出["plan", "private"]中的第一个元素用作key
    const key = decodeURIComponent(parts.shift());
    //将["private"]使用join("=")连接成一个字符串作为val
    const val = parts.length > 0 ? decodeURIComponent(parts.join("=")) : null;

    if (res[key] === undefined) {
      res[key] = val; //{plan: private}
    } else if (Array.isArray(res[key])) {
      //如果值是数组的话将val push进去
      res[key].push(val);
    } else {
      res[key] = [res[key], val];
    }
  });

  return res;
}

```
## 总结

match() 方法就是通过用户传入的路径字符串或者目标位置对象并且和当前的路由对象通过计算得出最新的路由。于是我们现在已经有了从 URL --> View 的一个映射关系。

并且在 normalizeLocation 方法里面我们还实现了相对路径的解析以及路径携带查询参数的方式。因此我们明白了为什么官方文档上说的假如我们同时提供了 path 和 params 的时候，params 会被忽略。

以下是推荐的几种路由导航的做法：
```js
// 字符串
router.push('home')

// 对象
router.push({ path: 'home' })

// 命名的路由
router.push({ name: 'user', params: { userId: '123' }})

// 带查询参数，变成 /register?plan=private
router.push({ path: 'register', query: { plan: 'private' }})


const userId = '123'
router.push({ name: 'user', params: { userId }}) // -> /user/123
router.push({ path: `/user/${userId}` }) // -> /user/123
// 这里的 params 不生效
router.push({ path: '/user', params: { userId }}) // -> /user

```
以上的规则也适用于 router-link 组件的 to 属性。


## 下期预告

实现了 Vue-router 和 matcher 我们有了路由配置表和视图之间的映射关系。即我们知道了每个 URL 对应需要渲染的视图内容。但是我们改变 URL 的时候如何让对应的视图更新呢？欲知详情，我们下期再会。

## Vue-Router 源码相关系列链接：

- [手写Vue Router源码系列一： 实现 VueRouter](https://juejin.cn/post/6991348164527685640)
- [手写Vue Router源码系列二：实现 matcher](https://juejin.cn/post/6993155485775953951)
- [手写vue-router源码系列三：实现改变hash后更新视图](https://juejin.cn/post/6994722379553308685)

