<script lang="ts">
  import CopyButton from "./CopyButton.svelte";

  const searchUrl =
    (import.meta.env.DEV ? "http://localhost:5173" : "https://unduck.link") +
    "?q=%s";
</script>

<details open>
  <summary>
    <h2>How can I use it?</h2>
  </summary>

  <p>
    Add this URL as a custom search engine in your browser to use bangs directly
    from your address bar:
  </p>

  <div class="url-input-container">
    <input type="text" value={searchUrl} readonly />
    <CopyButton textToCopy={searchUrl} />
  </div>

  <div class="examples">
    <div class="example">
      <strong>!g typescript tutorial</strong>
      <span>→ Search Google for "typescript tutorial"</span>
    </div>

    <div class="example">
      <strong>!gh microsoft/vscode</strong>
      <span>→ Go to GitHub repository</span>
    </div>

    <div class="example">
      <strong>!so javascript arrays</strong>
      <span>→ Search Stack Overflow</span>
    </div>
  </div>
</details>

<style>
  details {
    margin: 2rem 0;
  }

  summary {
    cursor: pointer;
    list-style: none;
    margin-bottom: 2rem;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary h2 {
    display: inline;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  summary::after {
    content: " ▼";
    font-size: 0.8em;
    color: var(--text-muted);
    margin-left: 0.5rem;
  }

  details:not([open]) summary::after {
    content: " ▶";
  }

  p {
    margin-bottom: 1.5rem;
    color: var(--text-muted);
  }

  .url-input-container {
    display: flex;
    align-items: center;
    margin: 1rem 0 2rem 0;
  }

  input[type="text"] {
    background: transparent;
    color: var(--text-color);
    border: none;
    border-bottom: 1px solid var(--text-subtle);
    padding: 0.75rem 0;
    font-size: 1rem;
    width: 100%;
    max-width: 400px;
    transition: border-color 0.2s ease;
    cursor: default;
  }

  .examples {
    margin: 2rem 0;
  }

  .example {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    margin: 0;
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    font-size: 0.9rem;
  }

  .example + .example {
    border-top: 1px dotted var(--text-subtle);
  }

  .example strong {
    font-weight: 600;
    color: var(--accent-color);
  }

  .example span {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .example {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }

    input[type="text"] {
      max-width: 100%;
    }
  }
</style>
