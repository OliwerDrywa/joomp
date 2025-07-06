import { RouterProvider, createRouter } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { routeTree } from "./routeTree.gen";
import { compress, decompress } from "./lib/compression";
import { parse, stringify } from "./lib/parsing";
import "./styles.css";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,

  parseSearch: (s) => {
    const search = new URLSearchParams(s);

    const x = {
      via: parse(
        decompress(
          search.get("via")!,
          // ?? "eJxtjcEKwyAMhl8omENvg9GH6AMMq0GlbrYaESm--9bKRg87JOEn35dobQB1VstRJggVnjhu933fU2sNDJgQjCfAPs99IhmVvVA8APIglJWMLypX335MxzbP_83KgDVkznM_HSllz2ns4GPLFOsPLlDc4gCPvpJ2UoRozoTTSspJf5v6g65_xTePOldk",
        ),
      ),
    } as Record<string, any>;

    if (search.has("notFound")) x.notFound = search.get("notFound");

    console.log(JSON.stringify(x, null, 2));
    return x;
  },

  stringifySearch: (x) => {
    const search = new URLSearchParams();

    if (x.notFound) search.set("notFound", x.notFound);
    search.set("via", compress(stringify(x.via)));

    return "?" + search.toString();
  },
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
