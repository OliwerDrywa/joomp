import { RouterProvider, createRouter } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { routeTree } from "./routeTree.gen";
import "./styles.css";
// import { compress, decompress } from "./lib/compression";
// import { parse, stringify } from "./lib/parsing";

const router = createRouter({
  routeTree,
  scrollRestoration: true,
  // defaultPreload: "intent",
  // defaultPreloadStaleTime: 0,

  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      const ROUTE_ORDER = ["/", "/edit", "/test"];

      console.log(fromLocation?.pathname, "->", toLocation.pathname);

      const from = ROUTE_ORDER.indexOf(fromLocation?.pathname ?? "");
      const to = ROUTE_ORDER.indexOf(toLocation?.pathname ?? "");
      if (from === -1 || to === -1 || from === to) return [];

      return from < to ? ["slide-left"] : ["slide-right"];
    },
  },

  // parseSearch: (s) => {
  //   const search = new URLSearchParams(s);
  //   const x = {} as Record<string, any>;

  //   for (const [key, value] of search.entries()) x[key] = value;

  //   try {
  //     const via = search.get("via");
  //     if (!via) throw null;
  //     x.via = parse(decompress(via));
  //   } catch {
  //     // param is missing or malformed
  //     // use a default value for `via`
  //     throw new Error("TODO");
  //   }

  //   return x;
  // },

  // stringifySearch: (x) => {
  //   const search = new URLSearchParams();

  //   for (const key in x) search.set(key, x[key]);

  //   try {
  //     const via = x.via;
  //     if (!via) throw null;
  //     search.set("via", compress(stringify(x.via)));
  //   } catch {
  //     // param is missing or malformed
  //     // use a default value for `via`
  //     throw new Error("TODO");
  //   }

  //   const searchStr = search.toString();
  //   if (!searchStr) return "";
  //   return "?" + searchStr;
  // },
});

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

const rootElement = document.getElementById("app");
if (rootElement) render(() => <App />, rootElement);
