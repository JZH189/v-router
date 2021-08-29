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
