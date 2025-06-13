<script lang="ts">
  import { link } from "@dvcol/svelte-simple-router";
  import { onMount } from "svelte";

  let defaultBang = $state("");

  // Load current default bang from localStorage
  function loadSettings() {
    defaultBang = localStorage.getItem("default-bang") || "g";
  }

  function saveSettings() {
    if (defaultBang.trim()) {
      localStorage.setItem("default-bang", defaultBang.trim());
      alert(
        "Settings saved! Your new default bang will be used for future searches.",
      );
    }
  }

  onMount(() => {
    loadSettings();
  });
</script>

<main class="settings">
  <div class="container">
    <header class="header">
      <a href="/dashboard" use:link class="back-button">← Back to Home</a>
      <h1 class="title">Settings</h1>
    </header>

    <section class="settings-section">
      <h2>Default Bang</h2>
      <p class="description">
        Choose which search engine to use when no bang is specified in your
        query. Popular options: <code>g</code> (Google), <code>ddg</code>
        (DuckDuckGo), <code>b</code> (Bing)
      </p>

      <div class="setting-row">
        <label for="default-bang">Default Bang:</label>
        <div class="input-group">
          <span class="bang-prefix">!</span>
          <input
            id="default-bang"
            bind:value={defaultBang}
            type="text"
            class="bang-input"
            placeholder="g"
          />
        </div>
      </div>

      <button onclick={saveSettings} class="save-button">
        Save Settings
      </button>
    </section>

    <section class="info-section">
      <h2>How to Use Bangs</h2>
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
        <div class="example">
          <strong>!w Albert Einstein</strong>
          <span>→ Search Wikipedia</span>
        </div>
      </div>

      <p class="note">
        <strong>Note:</strong> If you search without a bang, your default bang will
        be used automatically.
      </p>
    </section>
  </div>
</main>

<style>
  .settings {
    min-height: 100vh;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
    padding: 2rem;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 3rem;
  }

  .back-button {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    color: #374151;
    text-decoration: none;
    display: inline-block;
  }

  .back-button:hover {
    background: #e5e7eb;
  }

  .title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
  }

  .settings-section,
  .info-section {
    background: #f9fafb;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .settings-section h2,
  .info-section h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #111827;
  }

  .description {
    color: #6b7280;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .description code {
    background: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: "Monaco", "Menlo", monospace;
  }

  .setting-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .setting-row label {
    font-weight: 500;
    color: #374151;
  }

  .input-group {
    display: flex;
    align-items: center;
    max-width: 200px;
  }

  .bang-prefix {
    background: #e5e7eb;
    border: 2px solid #e5e7eb;
    border-right: none;
    border-radius: 8px 0 0 8px;
    padding: 0.75rem;
    font-weight: 600;
    color: #374151;
  }

  .bang-input {
    border: 2px solid #e5e7eb;
    border-left: none;
    border-radius: 0 8px 8px 0;
    padding: 0.75rem;
    font-size: 1rem;
    flex: 1;
  }

  .bang-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .save-button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  .save-button:hover {
    background: #2563eb;
  }

  .examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .example {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .example strong {
    font-family: "Monaco", "Menlo", monospace;
    color: #059669;
  }

  .example span {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .note {
    background: #dbeafe;
    border: 1px solid #93c5fd;
    border-radius: 8px;
    padding: 1rem;
    color: #1e40af;
    font-size: 0.9rem;
  }

  @media (prefers-color-scheme: dark) {
    .back-button {
      background: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    .back-button:hover {
      background: #4b5563;
    }

    .settings-section,
    .info-section {
      background: #1f2937;
    }

    .settings-section h2,
    .info-section h2 {
      color: #f9fafb;
    }

    .description {
      color: #9ca3af;
    }

    .description code {
      background: #374151;
      color: #f9fafb;
    }

    .setting-row label {
      color: #e5e7eb;
    }

    .bang-prefix {
      background: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    .bang-input {
      background: #111827;
      border-color: #4b5563;
      color: #f9fafb;
    }

    .bang-input:focus {
      border-color: #60a5fa;
    }

    .example {
      background: #111827;
      border-color: #374151;
    }

    .example strong {
      color: #34d399;
    }

    .example span {
      color: #9ca3af;
    }

    .note {
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #dbeafe;
    }
  }

  @media (max-width: 768px) {
    .settings {
      padding: 1rem;
    }

    .setting-row {
      align-items: stretch;
    }

    .input-group {
      max-width: none;
    }
  }
</style>
