import { c as createLucideIcon, j as jsxRuntimeExports } from './createLucideIcon-xgKOgya5.js';

/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const Construction = createLucideIcon("Construction", [
  ["rect", { x: "2", y: "6", width: "20", height: "8", rx: "1", key: "1estib" }],
  ["path", { d: "M17 14v7", key: "7m2elx" }],
  ["path", { d: "M7 14v7", key: "1cm7wv" }],
  ["path", { d: "M17 3v3", key: "1v4jwn" }],
  ["path", { d: "M7 3v3", key: "7o6guu" }],
  ["path", { d: "M10 14 2.3 6.3", key: "1023jk" }],
  ["path", { d: "m14 6 7.7 7.7", key: "1s8pl2" }],
  ["path", { d: "m8 6 8 8", key: "hl96qh" }]
]);

function PlaceholderPage({ label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Construction, { className: "w-7 h-7 text-violet-600" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold text-zinc-800", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-zinc-500 max-w-xs", children: "This micro-frontend is not yet deployed. Start its dev server or deploy its remote bundle." })
  ] });
}

export { PlaceholderPage };
