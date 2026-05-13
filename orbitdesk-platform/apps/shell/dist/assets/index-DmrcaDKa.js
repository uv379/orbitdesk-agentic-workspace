import { i as importShared } from './_virtual___federation_fn_import-Duh3m881.js';
import { j as jsxRuntimeExports, c as createLucideIcon } from './createLucideIcon-xgKOgya5.js';
import { r as reactDomExports } from './index-D9Af7wOI.js';

var createRoot;
var m = reactDomExports;
{
  createRoot = m.createRoot;
  m.hydrateRoot;
}

function createJSONStorage(getStorage, options) {
  let storage;
  try {
    storage = getStorage();
  } catch (e) {
    return;
  }
  const persistStorage = {
    getItem: (name) => {
      var _a;
      const parse = (str2) => {
        if (str2 === null) {
          return null;
        }
        return JSON.parse(str2, void 0 );
      };
      const str = (_a = storage.getItem(name)) != null ? _a : null;
      if (str instanceof Promise) {
        return str.then(parse);
      }
      return parse(str);
    },
    setItem: (name, newValue) => storage.setItem(name, JSON.stringify(newValue, void 0 )),
    removeItem: (name) => storage.removeItem(name)
  };
  return persistStorage;
}
const toThenable = (fn) => (input) => {
  try {
    const result = fn(input);
    if (result instanceof Promise) {
      return result;
    }
    return {
      then(onFulfilled) {
        return toThenable(onFulfilled)(result);
      },
      catch(_onRejected) {
        return this;
      }
    };
  } catch (e) {
    return {
      then(_onFulfilled) {
        return this;
      },
      catch(onRejected) {
        return toThenable(onRejected)(e);
      }
    };
  }
};
const persistImpl = (config, baseOptions) => (set, get, api) => {
  let options = {
    storage: createJSONStorage(() => window.localStorage),
    partialize: (state) => state,
    version: 0,
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...persistedState
    }),
    ...baseOptions
  };
  let hasHydrated = false;
  let hydrationVersion = 0;
  const hydrationListeners = /* @__PURE__ */ new Set();
  const finishHydrationListeners = /* @__PURE__ */ new Set();
  let storage = options.storage;
  if (!storage) {
    return config(
      (...args) => {
        console.warn(
          `[zustand persist middleware] Unable to update item '${options.name}', the given storage is currently unavailable.`
        );
        set(...args);
      },
      get,
      api
    );
  }
  const setItem = () => {
    const state = options.partialize({ ...get() });
    return storage.setItem(options.name, {
      state,
      version: options.version
    });
  };
  const savedSetState = api.setState;
  api.setState = (state, replace) => {
    savedSetState(state, replace);
    return setItem();
  };
  const configResult = config(
    (...args) => {
      set(...args);
      return setItem();
    },
    get,
    api
  );
  api.getInitialState = () => configResult;
  let stateFromStorage;
  const hydrate = () => {
    var _a, _b;
    if (!storage) return;
    const currentVersion = ++hydrationVersion;
    hasHydrated = false;
    hydrationListeners.forEach((cb) => {
      var _a2;
      return cb((_a2 = get()) != null ? _a2 : configResult);
    });
    const postRehydrationCallback = ((_b = options.onRehydrateStorage) == null ? void 0 : _b.call(options, (_a = get()) != null ? _a : configResult)) || void 0;
    return toThenable(storage.getItem.bind(storage))(options.name).then((deserializedStorageValue) => {
      if (deserializedStorageValue) {
        if (typeof deserializedStorageValue.version === "number" && deserializedStorageValue.version !== options.version) {
          if (options.migrate) {
            const migration = options.migrate(
              deserializedStorageValue.state,
              deserializedStorageValue.version
            );
            if (migration instanceof Promise) {
              return migration.then((result) => [true, result]);
            }
            return [true, migration];
          }
          console.error(
            `State loaded from storage couldn't be migrated since no migrate function was provided`
          );
        } else {
          return [false, deserializedStorageValue.state];
        }
      }
      return [false, void 0];
    }).then((migrationResult) => {
      var _a2;
      if (currentVersion !== hydrationVersion) {
        return;
      }
      const [migrated, migratedState] = migrationResult;
      stateFromStorage = options.merge(
        migratedState,
        (_a2 = get()) != null ? _a2 : configResult
      );
      set(stateFromStorage, true);
      if (migrated) {
        return setItem();
      }
    }).then(() => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(get(), void 0);
      stateFromStorage = get();
      hasHydrated = true;
      finishHydrationListeners.forEach((cb) => cb(stateFromStorage));
    }).catch((e) => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(void 0, e);
    });
  };
  api.persist = {
    setOptions: (newOptions) => {
      options = {
        ...options,
        ...newOptions
      };
      if (newOptions.storage) {
        storage = newOptions.storage;
      }
    },
    clearStorage: () => {
      storage == null ? void 0 : storage.removeItem(options.name);
    },
    getOptions: () => options,
    rehydrate: () => hydrate(),
    hasHydrated: () => hasHydrated,
    onHydrate: (cb) => {
      hydrationListeners.add(cb);
      return () => {
        hydrationListeners.delete(cb);
      };
    },
    onFinishHydration: (cb) => {
      finishHydrationListeners.add(cb);
      return () => {
        finishHydrationListeners.delete(cb);
      };
    }
  };
  if (!options.skipHydration) {
    hydrate();
  }
  return stateFromStorage || configResult;
};
const persist = persistImpl;

const {create: create$1} = await importShared('zustand');
const useAuthStore = create$1()(
  persist(
    (set) => ({
      user: {
        id: "usr-1",
        name: "Alex Rivera",
        email: "alex@acmecorp.io",
        avatarUrl: void 0
      },
      accessToken: "mock-token",
      isAuthenticated: true,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false })
    }),
    { name: "orbitdesk-auth" }
  )
);

const {useEffect: useEffect$3} = await importShared('react');
function AuthProvider({ children }) {
  const { accessToken, clearAuth } = useAuthStore();
  useEffect$3(() => {
    if (!accessToken) return;
    const REFRESH_INTERVAL = 14 * 60 * 1e3;
    const id = setInterval(() => {
      console.log("[AuthProvider] token refresh tick");
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [accessToken, clearAuth]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}

function WorkspaceProvider({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}

const scriptRel = (function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();const assetsURL = function(dep) { return "/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (true && deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};

const remotesMap = {
'mfe_dashboard':{url:'http://localhost:3001/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_chat':{url:'http://localhost:3002/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_documents':{url:'http://localhost:3003/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_agents':{url:'http://localhost:3004/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_workflows':{url:'http://localhost:3005/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_integrations':{url:'http://localhost:3006/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_artifacts':{url:'http://localhost:3007/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_usage':{url:'http://localhost:3008/assets/remoteEntry.js',format:'esm',from:'vite'},
  'mfe_settings':{url:'http://localhost:3009/assets/remoteEntry.js',format:'esm',from:'vite'}
};
                const currentImports = {};
                const loadJS = async (url, fn) => {
                    const resolvedUrl = typeof url === 'function' ? await url() : url;
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.onload = fn;
                    script.src = resolvedUrl;
                    document.getElementsByTagName('head')[0].appendChild(script);
                };

                function get(name, remoteFrom) {
                    return __federation_import(name).then(module => () => {
                        if (remoteFrom === 'webpack') {
                            return Object.prototype.toString.call(module).indexOf('Module') > -1 && module.default ? module.default : module
                        }
                        return module
                    })
                }
                
                function merge(obj1, obj2) {
                  const mergedObj = Object.assign(obj1, obj2);
                  for (const key of Object.keys(mergedObj)) {
                    if (typeof mergedObj[key] === 'object' && typeof obj2[key] === 'object') {
                      mergedObj[key] = merge(mergedObj[key], obj2[key]);
                    }
                  }
                  return mergedObj;
                }

                const wrapShareModule = remoteFrom => {
                  return merge({
                    'react':{'18.3.1':{get:()=>get(new URL('__federation_shared_react-BCcI129A.js', import.meta.url).href, remoteFrom), loaded:1}},'react-dom':{'18.3.1':{get:()=>get(new URL('__federation_shared_react-dom-BhMZJInU.js', import.meta.url).href, remoteFrom), loaded:1}},'react-router-dom':{'6.30.3':{get:()=>get(new URL('__federation_shared_react-router-dom-Bxc7RoK2.js', import.meta.url).href, remoteFrom), loaded:1}},'zustand':{'5.0.13':{get:()=>get(new URL('__federation_shared_zustand-Cx_v79BE.js', import.meta.url).href, remoteFrom), loaded:1}}
                  }, (globalThis.__federation_shared__ || {})['default'] || {});
                };

                async function __federation_import(name) {
                    currentImports[name] ??= import(name);
                    return currentImports[name]
                }

                async function __federation_method_ensure(remoteId) {
                    const remote = remotesMap[remoteId];
                    if (!remote.inited) {
                        if ('var' === remote.format) {
                            // loading js with script tag
                            return new Promise(resolve => {
                                const callback = () => {
                                    if (!remote.inited) {
                                        remote.lib = window[remoteId];
                                        remote.lib.init(wrapShareModule(remote.from));
                                        remote.inited = true;
                                    }
                                    resolve(remote.lib);
                                };
                                return loadJS(remote.url, callback);
                            });
                        } else if (['esm', 'systemjs'].includes(remote.format)) {
                            // loading js with import(...)
                            return new Promise((resolve, reject) => {
                                const getUrl = typeof remote.url === 'function' ? remote.url : () => Promise.resolve(remote.url);
                                getUrl().then(url => {
                                    import(/* @vite-ignore */ url).then(lib => {
                                        if (!remote.inited) {
                                            const shareScope = wrapShareModule(remote.from);
                                            lib.init(shareScope);
                                            remote.lib = lib;
                                            remote.lib.init(shareScope);
                                            remote.inited = true;
                                        }
                                        resolve(remote.lib);
                                    }).catch(reject);
                                });
                            })
                        }
                    } else {
                        return remote.lib;
                    }
                }

                function __federation_method_wrapDefault(module, need) {
                    if (!module?.default && need) {
                        let obj = Object.create(null);
                        obj.default = module;
                        obj.__esModule = true;
                        return obj;
                    }
                    return module;
                }

                function __federation_method_getRemote(remoteName, componentName) {
                    return __federation_method_ensure(remoteName).then((remote) => remote.get(componentName).then(factory => factory()));
                }

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const ArrowLeft = createLucideIcon("ArrowLeft", [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Bell = createLucideIcon("Bell", [
  ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", key: "1qo2s2" }],
  ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Bot = createLucideIcon("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const ChartNoAxesColumn = createLucideIcon("ChartNoAxesColumn", [
  ["line", { x1: "18", x2: "18", y1: "20", y2: "10", key: "1xfpm4" }],
  ["line", { x1: "12", x2: "12", y1: "20", y2: "4", key: "be30l9" }],
  ["line", { x1: "6", x2: "6", y1: "20", y2: "14", key: "1r4le6" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const ChevronDown = createLucideIcon("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const ChevronsUpDown = createLucideIcon("ChevronsUpDown", [
  ["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
  ["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const CreditCard = createLucideIcon("CreditCard", [
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2", key: "ynyp8z" }],
  ["line", { x1: "2", x2: "22", y1: "10", y2: "10", key: "1b3vmo" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const FileText = createLucideIcon("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const GitBranch = createLucideIcon("GitBranch", [
  ["line", { x1: "6", x2: "6", y1: "3", y2: "15", key: "17qcm7" }],
  ["circle", { cx: "18", cy: "6", r: "3", key: "1h7g24" }],
  ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
  ["path", { d: "M18 9a9 9 0 0 1-9 9", key: "n2h4wq" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const LayoutDashboard = createLucideIcon("LayoutDashboard", [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const LogOut = createLucideIcon("LogOut", [
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
  ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const MessageSquare = createLucideIcon("MessageSquare", [
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", key: "1lielz" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Package = createLucideIcon("Package", [
  [
    "path",
    {
      d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
      key: "1a0edw"
    }
  ],
  ["path", { d: "M12 22V12", key: "d0xqtd" }],
  ["path", { d: "m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7", key: "yx3hmr" }],
  ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const PanelLeftClose = createLucideIcon("PanelLeftClose", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m16 15-3-3 3-3", key: "14y99z" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const PanelLeftOpen = createLucideIcon("PanelLeftOpen", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m14 9 3 3-3 3", key: "8010ee" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Play = createLucideIcon("Play", [
  ["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Plug = createLucideIcon("Plug", [
  ["path", { d: "M12 22v-5", key: "1ega77" }],
  ["path", { d: "M9 8V2", key: "14iosj" }],
  ["path", { d: "M15 8V2", key: "18g5xt" }],
  ["path", { d: "M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z", key: "osxo6l" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Plus = createLucideIcon("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Search = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Settings = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Upload = createLucideIcon("Upload", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "17 8 12 3 7 8", key: "t8dd8p" }],
  ["line", { x1: "12", x2: "12", y1: "3", y2: "15", key: "widbto" }]
]);

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const User = createLucideIcon("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);

const {create} = await importShared('zustand');
const DEFAULT_WORKSPACES = [
  { id: "ws-1", name: "Acme Corp", plan: "pro" },
  { id: "ws-2", name: "Personal", plan: "free" },
  { id: "ws-3", name: "Side Project Co.", plan: "free" }
];
const useWorkspaceStore = create()(
  persist(
    (set) => ({
      current: DEFAULT_WORKSPACES[0],
      list: DEFAULT_WORKSPACES,
      sidebarCollapsed: false,
      setCurrent: (ws) => set({ current: ws }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed })
    }),
    { name: "orbitdesk-workspace" }
  )
);

const {useState: useState$1,useRef: useRef$1,useEffect: useEffect$2} = await importShared('react');
const PLAN_BADGE = {
  free: "bg-zinc-700 text-zinc-300",
  pro: "bg-violet-900 text-violet-300",
  enterprise: "bg-amber-900 text-amber-300"
};
function WorkspaceAvatar({ name, size = "md" }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const cls = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: `${cls} rounded-md bg-violet-600 flex items-center justify-center font-semibold text-white shrink-0`,
      children: initials
    }
  );
}
function WorkspaceSwitcher({ collapsed }) {
  const { current, list, setCurrent } = useWorkspaceStore();
  const [open, setOpen] = useState$1(false);
  const [query, setQuery] = useState$1("");
  const ref = useRef$1(null);
  const filtered = list.filter((ws) => ws.name.toLowerCase().includes(query.toLowerCase()));
  useEffect$2(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  function select(ws) {
    setCurrent(ws);
    setOpen(false);
    setQuery("");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: "relative px-3 py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setOpen((o) => !o),
        className: `w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-hover transition-colors group ${open ? "bg-sidebar-hover" : ""}`,
        title: collapsed ? current.name : void 0,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceAvatar, { name: current.name }),
          !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-left min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-white truncate leading-tight", children: current.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-sidebar-muted capitalize leading-tight", children: current.plan })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsUpDown, { className: "w-3.5 h-3.5 text-sidebar-muted shrink-0 group-hover:text-white transition-colors" })
          ] })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute left-3 right-3 top-full mt-1.5 z-50 bg-[#1C1C28] border border-sidebar-border rounded-xl shadow-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 border-b border-sidebar-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-sidebar-hover rounded-lg px-2.5 py-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-3.5 h-3.5 text-sidebar-muted shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            autoFocus: true,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Search workspaces…",
            className: "bg-transparent text-sm text-white placeholder-sidebar-muted outline-none w-full"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "py-1.5 max-h-52 overflow-y-auto", children: [
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "px-3 py-2 text-sm text-sidebar-muted", children: "No workspaces found" }),
        filtered.map((ws) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => select(ws),
            className: "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sidebar-hover transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceAvatar, { name: ws.name, size: "sm" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 text-left min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-white truncate", children: ws.name }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${PLAN_BADGE[ws.plan]}`,
                  children: ws.plan
                }
              ),
              current.id === ws.id && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5 text-violet-400 shrink-0" })
            ]
          }
        ) }, ws.id))
      ] })
    ] })
  ] });
}

const APP_ROUTES = [
  {
    path: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    remote: "mfe_dashboard"
  },
  {
    path: "/app/chat",
    label: "Chat",
    icon: MessageSquare,
    remote: "mfe_chat",
    ctxButton: { label: "New Chat", icon: Plus }
  },
  {
    path: "/app/documents",
    label: "Documents",
    icon: FileText,
    remote: "mfe_documents",
    ctxButton: { label: "Upload Document", icon: Upload }
  },
  {
    path: "/app/agents",
    label: "Agents",
    icon: Bot,
    remote: "mfe_agents",
    ctxButton: { label: "Run Agent", icon: Play }
  },
  {
    path: "/app/workflows",
    label: "Workflows",
    icon: GitBranch,
    remote: "mfe_workflows",
    ctxButton: { label: "Create Workflow", icon: Plus }
  },
  {
    path: "/app/integrations",
    label: "Integrations",
    icon: Plug,
    remote: "mfe_integrations"
  },
  {
    path: "/app/artifacts",
    label: "Artifacts",
    icon: Package,
    remote: "mfe_artifacts"
  },
  {
    path: "/app/usage",
    label: "Usage",
    icon: ChartNoAxesColumn,
    remote: "mfe_usage"
  },
  {
    path: "/app/settings",
    label: "Settings",
    icon: Settings,
    remote: "mfe_settings"
  }
];
function getRouteConfig(pathname) {
  return APP_ROUTES.find((r) => pathname.startsWith(r.path));
}

const {NavLink,useNavigate: useNavigate$2} = await importShared('react-router-dom');
const PRIMARY_ROUTES = APP_ROUTES.filter((r) => r.path !== "/app/settings");
const PINNED_ROUTES = APP_ROUTES.filter((r) => r.path === "/app/settings");
function UserAvatar$1({ name }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs font-semibold text-white shrink-0", children: initials });
}
function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useWorkspaceStore();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate$2();
  const collapsed = sidebarCollapsed;
  function handleLogout() {
    clearAuth();
    navigate("/login");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      className: `fixed left-0 top-0 h-screen z-40 flex flex-col bg-sidebar-bg border-r border-sidebar-border transition-[width] duration-200 ease-in-out ${collapsed ? "w-16" : "w-[240px]"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 pt-4 pb-2 shrink-0", children: [
          !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white text-[10px] font-bold", children: "O" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-semibold text-sm tracking-tight", children: "OrbitDesk" })
          ] }),
          collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white text-[10px] font-bold", children: "O" }) }),
          !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: toggleSidebar,
              className: "p-1.5 rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors",
              title: "Collapse sidebar",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftClose, { className: "w-4 h-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceSwitcher, { collapsed }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-3 border-t border-sidebar-border mb-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 overflow-y-auto px-2 space-y-0.5", children: PRIMARY_ROUTES.map((route) => {
          const Icon = route.icon;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            NavLink,
            {
              to: route.path,
              title: collapsed ? route.label : void 0,
              className: ({ isActive }) => `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? "bg-violet-600/20 text-white font-medium" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"}`,
              children: ({ isActive }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Icon,
                  {
                    className: `w-4 h-4 shrink-0 transition-colors ${isActive ? "text-violet-400" : "group-hover:text-white"}`
                  }
                ),
                !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: route.label }),
                isActive && !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto w-1 h-4 rounded-full bg-violet-500" })
              ] })
            },
            route.path
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 px-2 pb-3 space-y-1 border-t border-sidebar-border pt-2", children: [
          PINNED_ROUTES.map((route) => {
            const Icon = route.icon;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              NavLink,
              {
                to: route.path,
                title: collapsed ? route.label : void 0,
                className: ({ isActive }) => `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? "bg-violet-600/20 text-white font-medium" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-4 h-4 shrink-0" }),
                  !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: route.label })
                ]
              },
              route.path
            );
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: `flex items-center gap-2.5 rounded-lg px-2 py-2 mt-1 ${collapsed ? "justify-center" : ""}`,
              children: [
                user && /* @__PURE__ */ jsxRuntimeExports.jsx(UserAvatar$1, { name: user.name }),
                !collapsed && user && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-white truncate leading-tight", children: user.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-sidebar-muted truncate leading-tight", children: user.email })
                ] }),
                !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: handleLogout,
                    title: "Logout",
                    className: "p-1.5 rounded-md text-sidebar-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-3.5 h-3.5" })
                  }
                )
              ]
            }
          ),
          collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: toggleSidebar,
              className: "w-full flex justify-center p-1.5 rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors",
              title: "Expand sidebar",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftOpen, { className: "w-4 h-4" })
            }
          )
        ] })
      ]
    }
  );
}

const {useState,useRef,useEffect: useEffect$1} = await importShared('react');

const {useLocation,useNavigate: useNavigate$1} = await importShared('react-router-dom');
function UserMenuDropdown({ onClose }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate$1();
  const ref = useRef(null);
  useEffect$1(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  function logout() {
    clearAuth();
    navigate("/login");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref,
      className: "absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-zinc-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-zinc-900 truncate", children: user?.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 truncate", children: user?.email })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "py-1.5", children: [
          { icon: User, label: "Profile", action: () => navigate("/app/settings/profile") },
          { icon: CreditCard, label: "Billing", action: () => navigate("/app/settings/billing") }
        ].map(({ icon: Icon, label, action }) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              action();
              onClose();
            },
            className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-4 h-4 text-zinc-400" }),
              label
            ]
          }
        ) }, label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-zinc-100 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: logout,
            className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-4 h-4" }),
              "Log out"
            ]
          }
        ) })
      ]
    }
  );
}
function UserAvatar({ name }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs font-semibold text-white", children: initials });
}
function TopBar() {
  const location = useLocation();
  const { sidebarCollapsed } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const route = getRouteConfig(location.pathname);
  const CtxIcon = route?.ctxButton?.icon;
  const sidebarW = sidebarCollapsed ? "left-16" : "left-[240px]";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "header",
    {
      className: `fixed top-0 right-0 ${sidebarW} h-14 z-30 flex items-center justify-between px-5 bg-white/80 backdrop-blur-md border-b border-zinc-200/70 transition-[left] duration-200 ease-in-out`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-[15px] font-semibold text-zinc-900 tracking-tight", children: route?.label ?? "OrbitDesk" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: `hidden sm:flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5 transition-all ${searchFocused ? "ring-2 ring-violet-500/30 bg-white" : "hover:bg-zinc-200/60"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-3.5 h-3.5 text-zinc-400 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    placeholder: "Search…",
                    onFocus: () => setSearchFocused(true),
                    onBlur: () => setSearchFocused(false),
                    className: "bg-transparent text-sm text-zinc-700 placeholder-zinc-400 outline-none w-40"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "hidden lg:inline text-[10px] text-zinc-400 bg-zinc-200 rounded px-1 py-0.5 font-mono", children: "⌘K" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "relative p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-600" })
          ] }),
          route?.ctxButton && CtxIcon && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors shadow-sm shadow-violet-600/20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CtxIcon, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: route.ctxButton.label })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => setUserMenuOpen((o) => !o),
                className: "flex items-center gap-1.5 rounded-lg p-1 hover:bg-zinc-100 transition-colors",
                children: [
                  user && /* @__PURE__ */ jsxRuntimeExports.jsx(UserAvatar, { name: user.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-3.5 h-3.5 text-zinc-400 hidden sm:block" })
                ]
              }
            ),
            userMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(UserMenuDropdown, { onClose: () => setUserMenuOpen(false) })
          ] })
        ] })
      ]
    }
  );
}

const {Outlet} = await importShared('react-router-dom');

const {useEffect} = await importShared('react');
function AppShell() {
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceStore();
  useEffect(() => {
    function onResize() {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setSidebarCollapsed]);
  const contentLeft = sidebarCollapsed ? "ml-16" : "ml-[240px]";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-zinc-50", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Sidebar, {}),
    !sidebarCollapsed && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 z-30 bg-black/40 md:hidden",
        onClick: () => setSidebarCollapsed(true)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `${contentLeft} transition-[margin] duration-200 ease-in-out`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TopBar, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "pt-14 min-h-screen", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }) })
    ] })
  ] });
}

function LoadingPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 animate-pulse", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-48 rounded-lg bg-zinc-200" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-32 rounded-xl bg-zinc-200" }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-48 rounded-xl bg-zinc-200" })
  ] });
}

const {useNavigate} = await importShared('react-router-dom');
function NotFoundPage() {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh] text-center gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-6xl font-bold text-zinc-200", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-zinc-800", children: "Page not found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 max-w-xs", children: "This page doesn't exist or you don't have access to it." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => navigate("/app/dashboard"),
        className: "flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium mt-2",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4" }),
          "Back to Dashboard"
        ]
      }
    )
  ] });
}

const {lazy,Suspense} = await importShared('react');

const {Routes,Route,Navigate} = await importShared('react-router-dom');
const DashboardPage = lazy(
  () => __federation_method_getRemote("mfe_dashboard" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Dashboard" }) })))
);
const ChatPage = lazy(
  () => __federation_method_getRemote("mfe_chat" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Chat" }) })))
);
const DocumentsPage = lazy(
  () => __federation_method_getRemote("mfe_documents" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Documents" }) })))
);
const AgentsPage = lazy(
  () => __federation_method_getRemote("mfe_agents" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Agents" }) })))
);
const WorkflowsPage = lazy(
  () => __federation_method_getRemote("mfe_workflows" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Workflows" }) })))
);
const IntegrationsPage = lazy(
  () => __federation_method_getRemote("mfe_integrations" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Integrations" }) })))
);
const ArtifactsPage = lazy(
  () => __federation_method_getRemote("mfe_artifacts" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Artifacts" }) })))
);
const UsagePage = lazy(
  () => __federation_method_getRemote("mfe_usage" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Usage" }) })))
);
const SettingsPage = lazy(
  () => __federation_method_getRemote("mfe_settings" , "./App").then(module=>__federation_method_wrapDefault(module, true)).catch(() => __vitePreload(() => import('./PlaceholderPage-BVAm_voa.js'),true?[]:void 0).then((m) => ({ default: () => m.PlaceholderPage({ label: "Settings" }) })))
);
function AppRouter() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/app/dashboard", replace: true }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Route, { path: "/app/*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, {}), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "dashboard/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "chat/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "documents/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "agents/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(AgentsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "workflows/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "integrations/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IntegrationsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "artifacts/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArtifactsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "usage/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(UsagePage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "settings/*",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingPage, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPage, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(NotFoundPage, {}) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(NotFoundPage, {}) })
  ] });
}

const {BrowserRouter} = await importShared('react-router-dom');
function AppRoot() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AuthProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppRouter, {}) }) }) });
}

const {StrictMode} = await importShared('react');
const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");
createRoot(root).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppRoot, {}) })
);
