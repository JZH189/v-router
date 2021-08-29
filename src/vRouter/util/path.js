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
