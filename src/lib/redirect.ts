import RedirectMap from "./redirectTree";

export default function redirect() {
  const params = new URLSearchParams(window.location.search);

  const q = params.get("q");
  if (!q) throw new Error("missing 'q' parameter");

  const b = params.get("b");
  if (!b) throw new Error("missing 'b' parameter");

  const tree = RedirectMap.deserialize(b);
  const urls = tree.getRedirectUrls(decodeURI(q));

  if (urls.length === 1) {
    // single url -> redirect to it
    window.document.title = `➜ ${urls[0]}`;
    window.location.replace(urls[0]);
  } else {
    // multiple urls -> open in new tabs
    for (const url of urls) openInNewTab(url);
    closeSelf();
  }
}

function openInNewTab(url: string) {
  const w = window.open(url);
  // close custom protocol links like obsidian://
  // #todo figure out what happens if custom protocol is in browser
  if (!url.startsWith("http")) w?.close();

  // // close tab by onvisibilitychange
  // if (!finalUrl.startsWith("http")) {
  //   document.onvisibilitychange = () => {
  //     if (document.visibilityState === "visible") return;
  //     window.close();
  //   };
  // }
}

function closeSelf() {
  // a hacky way to take ownership of current tab
  // #todo figure out the browser support
  window.open("", "_self")?.close();
  // window.close();
}
