const trailingSlashRE = /\/?$/;
/**
 * 此方法返回一个Route对象。
 * 表⽰的是路由中的⼀条线路，它除了描述了类似 Loctaion 的name、 path 、 query 、 hash 、meta这 些概念，
 * 还有 matched 表⽰匹配到的所有的 RouteRecord 。
 * @param {*} record
 * @param {*} location
 * @returns
 */
export function createRoute(record, location) {
  let query = location.query || {};
  try {
    query = clone(query);
  } catch (e) {}
  //路由记录
  const route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || "/",
    hash: location.hash || "",
    query,
    params: location.params || {},
    fullPath: getFullPath(location),
    matched: record ? formatMatch(record) : [],
  };

  return Object.freeze(route);
}

// 初始化的route
export const START = createRoute(null, {
  path: "/",
});

function formatMatch(record) {
  const res = [];
  while (record) {
    res.unshift(record);
    record = record.parent;
  }
  return res;
}

//解构 location 对象
function getFullPath({ path, query = {}, hash = "" }) {
  return (path || "/") + stringifyQuery(query) + hash;
}

function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  } else if (value && typeof value === "object") {
    const res = {};
    for (const key in value) {
      res[key] = clone(value[key]);
    }
    return res;
  } else {
    return value;
  }
}

function stringifyQuery(obj) {
  const res = obj
    ? Object.keys(obj)
        .map((key) => {
          const val = obj[key];

          if (val === undefined) {
            return "";
          }

          if (val === null) {
            return encode(key);
          }

          if (Array.isArray(val)) {
            const result = [];
            val.forEach((val2) => {
              if (val2 === undefined) {
                return;
              }
              if (val2 === null) {
                result.push(encode(key));
              } else {
                result.push(encode(key) + "=" + encode(val2));
              }
            });
            return result.join("&");
          }

          return encode(key) + "=" + encode(val);
        })
        .filter((x) => x.length > 0)
        .join("&")
    : null;
  return res ? `?${res}` : "";
}

export function isSameRoute(a, b, onlyPath) {
  if (b === START) {
    return a === b;
  } else if (!b) {
    return false;
  } else if (a.path && b.path) {
    return (
      a.path.replace(trailingSlashRE, "") ===
        b.path.replace(trailingSlashRE, "") &&
      (onlyPath || (a.hash === b.hash && isObjectEqual(a.query, b.query)))
    );
  } else if (a.name && b.name) {
    return (
      a.name === b.name &&
      (onlyPath ||
        (a.hash === b.hash &&
          isObjectEqual(a.query, b.query) &&
          isObjectEqual(a.params, b.params)))
    );
  } else {
    return false;
  }
}

function isObjectEqual(a = {}, b = {}) {
  if (!a || !b) return a === b;
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key, i) => {
    const aVal = a[key];
    const bKey = bKeys[i];
    if (bKey !== key) return false;
    const bVal = b[key];
    if (aVal == null || bVal == null) return aVal === bVal;
    if (typeof aVal === "object" && typeof bVal === "object") {
      return isObjectEqual(aVal, bVal);
    }
    return String(aVal) === String(bVal);
  });
}
