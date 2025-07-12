import type { Accessor } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      pixelsAnimation: (typeof PIXEL_STYLES)[number];
    }
  }
}

const PIXEL_STYLES = [
  {
    init: /*tw*/ "bg-amber-300 dark:bg-amber-900".split(" "),
    hover: /*tw*/ "hover:bg-amber-300 dark:hover:bg-amber-900".split(" "),
  },
  {
    init: /*tw*/ "bg-blue-300 dark:bg-blue-900".split(" "),
    hover: /*tw*/ "hover:bg-blue-300 dark:hover:bg-blue-900".split(" "),
  },
  {
    init: /*tw*/ "bg-green-300 dark:bg-green-900".split(" "),
    hover: /*tw*/ "hover:bg-green-300 dark:hover:bg-green-900".split(" "),
  },
  {
    init: /*tw*/ "bg-red-300 dark:bg-red-900".split(" "),
    hover: /*tw*/ "hover:bg-red-300 dark:hover:bg-red-900".split(" "),
  },
];

export const getStyles = () =>
  PIXEL_STYLES[Math.floor(Math.random() * PIXEL_STYLES.length)];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function pixelsAnimation(
  el: HTMLSpanElement,
  styles: Accessor<(typeof PIXEL_STYLES)[number]>,
) {
  const { init, hover } = styles();
  el.classList.add(...init);
  await wait(750 + Math.random() * 1750);
  el.classList.remove(...init);
  el.classList.add(...hover);
  await wait(200);
  el.classList.replace("duration-200", "duration-2000");
}
