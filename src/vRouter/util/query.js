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
