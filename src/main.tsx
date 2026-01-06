import { RouterProvider, createRouter } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({
  routeTree,
  scrollRestoration: true,
  // defaultPreload: "intent",
  // defaultPreloadStaleTime: 0,

  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      const ROUTE_ORDER = ["/", "/edit", "/test"];

      const from = ROUTE_ORDER.indexOf(fromLocation?.pathname ?? "");
      const to = ROUTE_ORDER.indexOf(toLocation?.pathname ?? "");
      if (from === -1 || to === -1 || from === to) return [];

      return from < to ? ["slide-left"] : ["slide-right"];
    },
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
