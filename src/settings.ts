import "./global.css";
import { mount } from "svelte";
import Settings from "./Settings.svelte";

export default mount(Settings, {
  target: document.getElementById("settings")!,
});
