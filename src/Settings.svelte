<script lang="ts">
  import UsageInstructions from "./components/UsageInstructions.svelte";
  import DefaultBangSettings from "./components/DefaultBangSettings.svelte";
  import CustomBangsEditor from "./components/CustomBangsEditor.svelte";

  // Handle error messages from URL parameters
  const url = new URL(window.location.href);
  const urlParams = new URLSearchParams(url.search);

  let errorMessage = $state("");
  let invalidBang = $state("");
  let errorType = $state("");

  // Check for localStorage error
  if (urlParams.has("localStorageError")) {
    errorMessage =
      "There was a problem loading your custom bangs from local storage.";
    errorType = "localStorageError";
  }

  // Check for invalid bang error
  const invalidBangParam = urlParams.get("invalidBang");
  if (invalidBangParam) {
    errorMessage = `Bang "!${invalidBangParam}" was not found.`;
    invalidBang = invalidBangParam;
    errorType = "invalidBang";
  }
</script>

<main>
  <hgroup>
    <h1>What is this?</h1>
    <p>
      This is a fork of
      <a
        href="https://github.com/t3dotgg/unduck"
        target="_blank"
        rel="noopener"
      >
        Theo's und*ck
      </a>
      that lets you use, create, remove, and update
      <a href="https://duckduckgo.com/bang.html" target="_blank" rel="noopener">
        DuckDuckGo's bangs
      </a>
      to search different websites directly. You can add your own shortcuts or modify
      existing ones to match your workflow, all stored locally in your browser.
    </p>
  </hgroup>

  <UsageInstructions />

  <div class="callout">
    <p>
      <strong>Bang Priority Order:</strong> Search engine is determined by: (1) Query
      bang (!g), (2) Custom default setting, (3) URL hash, (4) Google fallback
    </p>
  </div>

  <h1>Customize bangs</h1>

  <CustomBangsEditor {errorMessage} {invalidBang} {errorType} />

  <DefaultBangSettings />
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    line-height: 1.7;
    color: var(--text-color);
    min-height: 100vh;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  /* Color palette with purple accent colors */
  :global(:root) {
    --text-color: #1a1a1a;
    --text-muted: #666666;
    --text-subtle: #999999;
    --accent-color: #8b5cf6;
    --accent-hover: #7c3aed;
    --accent-light: #f3e8ff;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --text-color: #e8e8e8;
      --text-muted: #a0a0a0;
      --text-subtle: #666666;
      --accent-color: #a78bfa;
      --accent-hover: #8b5cf6;
      --accent-light: #3730a3;
    }
  }

  /* Typography with generous spacing */
  h1 {
    margin: 0 0 3rem 0;
    font-size: 2.25rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }

  hgroup h1 {
    margin: 0 0 1rem 0;
  }

  /* Larger gap before "Customize bangs" section */
  h1:not(hgroup h1) {
    margin-top: 6rem;
  }

  hgroup p {
    margin-bottom: 1.5rem;
    color: var(--text-muted);
  }

  /* Clean links with accent color */
  a {
    color: var(--accent-color);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
    transition: color 0.2s ease;
  }

  a:hover {
    color: var(--accent-hover);
    text-decoration-thickness: 2px;
  }

  /* Callout styling with accent color */
  .callout {
    background: var(--accent-light);
    border-left: 3px solid var(--accent-color);
    padding: 1rem 1.5rem;
    margin: 2rem 0;
    font-size: 0.9rem;
    border-radius: 8px;
  }

  .callout p {
    margin: 0;
    color: var(--text-muted);
  }

  .callout strong {
    color: var(--accent-color);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    main {
      padding: 2rem 1rem;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 2rem;
    }

    h1:not(hgroup h1) {
      margin-top: 5rem;
    }
  }
</style>
