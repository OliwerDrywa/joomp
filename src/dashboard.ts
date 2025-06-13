import "./global.css";
import { mount } from "svelte";
import Router from "./router.svelte";

const app = mount(Router, {
  target: document.getElementById("dashboard-app")!,
  // props: { some: "property" },
});

export default app;
