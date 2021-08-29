export const supportsPushState =
  window.history && typeof window.history.pushState === "function";

export function pushState(url, replace) {
  const history = window.history;
  try {
    if (replace) {
      history.replaceState({}, "", url);
    } else {
      history.pushState({}, "", url);
    }
  } catch (e) {
    window.location[replace ? "replace" : "assign"](url);
  }
}

export function replaceState(url) {
  pushState(url, true);
}
