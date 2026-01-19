import RedirectMap from "./redirectTree";

export default function redirect() {
  const params = new URLSearchParams(location.search);

  const q = params.get("q");
  if (!q) throw new Error("missing 'q' parameter");

  const b = params.get("b");
  if (!b) throw new Error("missing 'b' parameter");

  const tree = RedirectMap.fromString(b);
  const urls = tree.getRedirectUrls(decodeURI(q));

  for (const url of urls) location.replace(url);

  const finalUrl = urls.at(-1)!;
  document.title = `➜ ${finalUrl}`;

  // close tab if redirecting to external app
  if (
    finalUrl.includes("://") &&
    !(finalUrl.includes("https://") || finalUrl.includes("http://"))
  ) {
    document.onvisibilitychange = () => {
      if (document.visibilityState === "visible") return;
      window.close();
    };

    // show "You may now close this tab"
    // setTimeout(() => document.body.classList.add("show-close-ui"), 1500);
  }
}
