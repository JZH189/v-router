import { createRoute } from "./util/route";
import { createRouteMap } from "./create-route-map";
import { normalizeLocation } from "./util/location";

/**
 * createMatcher 接收 2 个参数，⼀个是⽤户定义的路由配置（routes），
 * ⼀个是 new VueRouter 返回的实例（router）。
 * @param {*} routes
 * @param {*} router
 * @returns
 */
export function createMatcher(routes, router) {
  //返回用户定义的路由配置映射
  const { pathList, pathMap, nameMap } = createRouteMap(routes);

  // addRoutes ⽅法用来动态添加更多的路由规则。参数必须是一个符合 routes 选项要求的数组。
  function addRoutes(routes) {
    createRouteMap(routes, pathList, pathMap, nameMap);
  }
  //添加一条新路由规则。如果该路由规则有 name，并且已经存在一个与之相同的名字，则会覆盖它。
  function addRoute(parentOrRoute, route) {
    //parent就是一个路由记录（record）
    //todo 此处的parentOrRoute可以是父路由的name也可以为父路由的配置对象
    const parent =
      typeof parentOrRoute !== "object" ? nameMap[parentOrRoute] : undefined;
    createRouteMap(
      [route || parentOrRoute],
      pathList,
      pathMap,
      nameMap,
      parent
    );
  }

  //返回pathMap
  function getRoutes() {
    return pathList.map((path) => pathMap[path]);
  }

  function match(raw, currentRoute) {
    //normalizeLocation ⽅法的作⽤是根据 raw 和 currentRoute 计算出新的 location 对象：{ _normalized: true, path, query, hash,}
    //举个例子： "/foo?foo=foo&bar=bar#hello" ,它的 path 是 /foo ， query 是 {foo:foo,bar:bar}
    const location = normalizeLocation(raw, currentRoute, false);
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
    //源码中还支持接收第三个参数：router =>  createRoute(record, location, router)
    //因为源码中可以支持提供自定义查询字符串的解析/反解析函数(options.stringifyQuery)来覆盖默认行为。为了减少干扰项因此我就去掉了这个参数。
    //官方文档parseQuery / stringifyQuery： https://router.vuejs.org/zh/api/#parsequery-stringifyquery
    return createRoute(record, location);
  }

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes,
  };
}

function matchRoute(regex, path, params) {
  //通过regex来匹配path字段
  const m = path.match(regex);
  if (!m) {
    return false;
  } else if (!params) {
    return true;
  }
  return true;
}
