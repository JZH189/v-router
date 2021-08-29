import { History } from "./base";
import { pushState, replaceState, supportsPushState } from "../util/push-state";

export class HashHistory extends History {
  constructor(router, base) {
    super(router, base);
    ensureSlash();
  }

  setupListeners() {
    //避免重复监听
    if (this.listeners.length > 0) {
      return;
    }
    /**
     * 监听浏览器前进、后退或者 hashchange 事件并且维护history对象
     */
    const handleRoutingEvent = () => {
      this.transitionTo(getHash(), (route) => {
        if (!supportsPushState) {
          replaceHash(route.fullPath);
        }
      });
    };
    const eventType = supportsPushState ? "popstate" : "hashchange";
    window.addEventListener(eventType, handleRoutingEvent);
    //有事件监听必须要有取消监听
    this.listeners.push(() => {
      window.removeEventListener(eventType, handleRoutingEvent);
    });
  }

  push(location, onComplete) {
    this.transitionTo(location, (route) => {
      pushHash(route.fullPath);
      onComplete && onComplete(route);
    });
  }

  replace(location, onComplete) {
    this.transitionTo(location, (route) => {
      replaceHash(route.fullPath);
      onComplete && onComplete(route);
    });
  }

  go(n) {
    window.history.go(n);
  }

  getCurrentLocation() {
    return getHash();
  }

  ensureURL(push) {
    const current = this.current.fullPath;
    if (getHash() !== current) {
      push ? pushHash(current) : replaceHash(current);
    }
  }
}

function pushHash(path) {
  if (supportsPushState) {
    pushState(getUrl(path));
  } else {
    window.location.hash = path;
  }
}

function ensureSlash() {
  const path = getHash();
  if (path.charAt(0) === "/") {
    return true;
  }
  replaceHash("/" + path);
  return false;
}

export function getHash() {
  let href = window.location.href;
  const index = href.indexOf("#");
  if (index < 0) return "";
  href = href.slice(index + 1);
  return href;
}

// path = "/"
function replaceHash(path) {
  if (supportsPushState) {
    replaceState(getUrl(path));
  } else {
    window.location.replace(getUrl(path));
  }
}

function getUrl(path) {
  const href = window.location.href;
  const i = href.indexOf("#");
  const base = i >= 0 ? href.slice(0, i) : href;
  return `${base}#${path}`;
}
