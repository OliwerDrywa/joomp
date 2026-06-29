import RedirectMap from "./redirectTree";

/** The default redirect config, shared by the app and the OpenSearch endpoint. */
export const DEFAULT_DSL = `
  !pp => perplexity.ai
  !pp ... => perplexity.ai/search?q={{{s}}}
  !w ... => duckduckgo.com/?q=weather+{{{s}}}
  !o => obsidian://daily
  !o search ... => obsidian://search?query={{{s}}}
  !o ... => obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}
  !todo => obsidian://daily
  !todo x ... => obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}
  !todo ... => obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}
  !steam ... => steam://open/bigpicture
  !joomp => /edit
  ... => duckduckgo.com/?q={{{s}}}
`;

export const DEFAULT_B = RedirectMap.fromDSL(DEFAULT_DSL).serialize();
