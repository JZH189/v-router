import { START } from "../util/route";
import { inBrowser } from "../util/dom";
import { _Vue } from "../install";

export class History {
  constructor(router, base) {
    // 应用的基路径。例如，如果整个单页应用服务在 /app/ 下，然后 base 就应该设为 "/app/"。
    this.base = normalizeBase(base);
    this.router = router; //保存router实列
    this.current = START;
    this.listeners = [];
  }

  listen(cb) {
    //保存将来供 History 调用的方法
    this.cb = cb;
  }

  teardown() {
    // 清空事件监听
    this.listeners.forEach((cleanupListener) => {
      cleanupListener();
    });
    this.listeners = [];

    // 重置当前路由
    this.current = START;
  }

  updateRoute(route) {
    this.current = route;
    this.cb && this.cb(route);
  }

  transitionTo(location, onComplete) {
    //计算目标route
    const route = this.router.match(location, this.current);
    const prev = this.current;
    this.confirmTransition(route, () => {
      //更新当前route
      this.updateRoute(route);
      onComplete && onComplete(route);
      this.ensureURL();
      //执行全局后置钩子
      this.router.afterHooks.forEach((hook) => {
        hook && hook(route, prev);
      });
    });
  }

  confirmTransition(route, onComplete) {
    const current = this.current;
    // updated 被重用的路由
    // activated 被激活的路由
    // deactivated 失活的路由

    const { updated, deactivated, activated } = resolveQueue(
      current.matched,
      route.matched
    );

    const queue = [].concat(
      // 从失活的路由提取 beforeRouteLeave 钩子
      extractLeaveGuards(deactivated),
      // 获取全局前置钩子
      this.router.beforeHooks,
      // 从重用的路由中提取 beforeRouteUpdate 钩子
      extractUpdateHooks(updated),
      // 从被激活的路由中提取 beforeEnter 钩子
      activated.map((m) => m.beforeEnter),
      // 解析异步路由
      resolveAsyncComponents(activated)
    );

    //这里的hook指的是我们的路由守卫钩子，只有执行next回调才会执行下一个钩子
    const iterator = (hook, next) => {
      try {
        //这个地方的hook就相当于我们自己定义的路由守卫： NavigationGuard(to, from, next)
        hook(route, current, (to) => {
          if (to === false) {
            this.ensureURL(true);
          } else if (isError(to)) {
            this.ensureURL(true);
          } else if (
            typeof to === "string" ||
            (typeof to === "object" &&
              (typeof to.path === "string" || typeof to.name === "string"))
          ) {
            if (typeof to === "object" && to.replace) {
              this.replace(to);
            } else {
              this.push(to);
            }
          } else {
            next(to);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };

    runQueue(queue, iterator, () => {
      // 提取 beforeRouteEnter 钩子
      const enterGuards = extractEnterGuards(activated);
      // 将 beforeRouteEnter 钩子数组与 beforeResolve 钩子数组连接起来组成新的队列
      const queue = enterGuards.concat(this.router.resolveHooks);
      // 等到异步组件加载完成之后再去执行一遍新的queue队列并且更新视图
      runQueue(queue, iterator, () => {
        onComplete && onComplete();
        if (this.router.app) {
          //当组件实例加载完成时候调用next的回调函数
          this.router.app.$nextTick(() => {
            //等待新组件被创建后执行handleRouteEntered函数，相当于执行 beforeRouteEnter 钩子
            handleRouteEntered(route);
          });
        }
      });
    });
  }
}

function isError(err) {
  return Object.prototype.toString.call(err).indexOf("Error") > -1;
}

function normalizeBase(base) {
  if (!base) {
    if (inBrowser) {
      //如果在浏览器环境中会首先查找 <base href="" /> 中的href地址
      const baseEl = document.querySelector("base");
      base = (baseEl && baseEl.getAttribute("href")) || "/";
      //  "https://foo/" >> "/"
      base = base.replace(/^https?:\/\/[^\/]+/, "");
    } else {
      base = "/";
    }
  }
  //确保 base 以 "/" 开头
  if (base.charAt(0) !== "/") {
    base = "/" + base;
  }
  //去掉路径最后的 "/"
  return base.replace(/\/$/, "");
}

//序列化执行异步函数，只有执行next回调才会执行下一个钩子
function runQueue(queue, fn, cb) {
  const step = (index) => {
    if (index >= queue.length) {
      cb();
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1);
        });
      } else {
        step(index + 1);
      }
    }
  };
  step(0);
}

function resolveQueue(current, next) {
  let i;
  const max = Math.max(current.length, next.length);
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break;
    }
  }
  return {
    updated: next.slice(0, i),
    activated: next.slice(i),
    deactivated: current.slice(i),
  };
}

/**
 * 将提取到的组件守卫钩子"绑定"到对应的组件实例上
 * @param {*} guard
 * @param {*} instance
 * @returns
 */
function bindGuard(guard, instance) {
  if (instance) {
    //const iterator = (hook, next) 中的 hook 就是 boundRouteGuard()
    return function boundRouteGuard() {
      return guard.apply(instance, arguments);
    };
  }
}

function bindEnterGuard(guard, match, key) {
  return function routeEnterGuard(to, from, next) {
    //guard => beforeRouteEnter
    //这里的cb就是我们平时在beforeRouteEnter的next中写的回调函数
    // next(vm => {
    //   通过 `vm` 访问组件实例
    //   console.log('vm: ', vm);
    // })
    return guard(to, from, (cb) => {
      if (typeof cb === "function") {
        if (!match.enteredCbs[key]) {
          match.enteredCbs[key] = [];
        }
        match.enteredCbs[key].push(cb);
      }
      next(cb);
    });
  };
}

//提取 beforeRouteEnter 钩子
function extractEnterGuards(activated) {
  return extractGuards(
    activated,
    "beforeRouteEnter",
    (guard, _, match, key) => {
      return bindEnterGuard(guard, match, key);
    }
  );
}

//提取 beforeRouteLeave 钩子
function extractLeaveGuards(deactivated) {
  return extractGuards(deactivated, "beforeRouteLeave", bindGuard, true);
}

//提取 beforeRouteUpdate 钩子
function extractUpdateHooks(updated) {
  return extractGuards(updated, "beforeRouteUpdate", bindGuard);
}

/**
 * extractGuards 最终会返回一个包含了对应 name 的组件路由守卫钩子组成的数组
 * bind => bindGuard(guard, instance)
 */
function extractGuards(records, name, bind, reverse) {
  // 循环records 再遍历每个records.record => {path: "/foo", regex: /^\/foo[\/#\?]?$/i, components: {…}, instances: {…}, beforeEnter: ƒ, …}
  // 这样就能拿到record.components.component 最终就是这个def，也就是我们写的.vue组件
  const guards = flatMapComponents(records, (def, instance, match, key) => {
    // 通过传入的.vue组件和路由守卫钩子名称就能获取到最终的钩子函数啦！
    const guard = extractGuard(def, name);
    if (guard) {
      return Array.isArray(guard)
        ? //这个 bind(guard, instance, match, key) 其实调用的就是 bindGuard(guard, instance, match, key) => guard.apply(instance, arguments)
          guard.map((guard) => bind(guard, instance, match, key))
        : bind(guard, instance, match, key);
    }
  });
  return flatten(reverse ? guards.reverse() : guards);
}

function extractGuard(def, key) {
  if (typeof def !== "function") {
    //使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象。这样就可以通过 options[NavigationGuard] 获取到组件内对应的钩子函数了
    def = _Vue.extend(def);
  }
  return def.options[key];
}

//解析异步组件
function resolveAsyncComponents(matched) {
  return (to, from, next) => {
    let hasAsync = false;
    let error = null;

    // fn(m.components[key], m.instances[key], m, key)
    flatMapComponents(matched, (def, _, match, key) => {
      // 首先利⽤了 flatMapComponents ⽅法从 matched 中获取到每个组件的定义。然后判断如果是异步组件，则执⾏异步组件加载逻辑。
      if (typeof def === "function" && def.cid === undefined) {
        hasAsync = true;

        const resolve = (resolvedDef) => {
          // resolve 返回的是一个 ES Module
          if (resolvedDef.__esModule) {
            resolvedDef = resolvedDef.default;
          }
          // 把解析好的异步组件放到对应的 components 上，并且执⾏ next 函数。
          match.components[key] = resolvedDef;
          next();
        };

        const reject = (reason) => {
          const msg = `Failed to resolve async component ${key}: ${reason}`;
          if (!error) {
            error = isError(reason) ? reason : new Error(msg);
            next(error);
          }
        };

        let res;
        try {
          // 执行这个Promise函数
          res = def(resolve, reject);
        } catch (e) {
          reject(e);
        }
        if (res) {
          // 如果有then方法则执行它
          if (typeof res.then === "function") {
            res.then(resolve, reject);
          }
        }
      }
    });

    if (!hasAsync) next();
  };
}

function flatMapComponents(matched, fn) {
  return flatten(
    matched.map((m) => {
      //遍历components里面的name，再依次执行fn(components.default, instances, components, 'default')
      return Object.keys(m.components).map((key) =>
        fn(m.components[key], m.instances[key], m, key)
      );
    })
  );
}

function flatten(arr) {
  return Array.prototype.concat.apply([], arr);
}

//执行 beforeRouteEnter 钩子的函数
function handleRouteEntered(route) {
  for (let i = 0; i < route.matched.length; i++) {
    //从route.matched中获取路由记录
    const record = route.matched[i];
    //遍历record.instances
    for (const name in record.instances) {
      //获取组件
      const instance = record.instances[name];
      const cbs = record.enteredCbs[name];
      if (!instance || !cbs) {
        continue;
      }
      delete record.enteredCbs[name];
      for (let i = 0; i < cbs.length; i++) {
        if (!instance._isBeingDestroyed) {
          //如果组件没有被销毁就执行 beforeRouteEnter 里面的next(vm => { //通过 `vm` 访问组件实例 console.log('vm: ', vm);}) 方法传入的回调函数，参数是当前组件实例。
          //所以官方文档说在beforeRouteEnter 守卫不能访问this，但是可以通过传一个回调给next来访问组件实例。
          cbs[i](instance);
        }
      }
    }
  }
}
