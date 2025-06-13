<script lang="ts">
  import { useLink } from "@dvcol/svelte-simple-router";

  type Props = {
    errorMessage?: string;
    invalidBang?: string;
  };

  let { errorMessage = "", invalidBang = "" }: Props = $props();

  $inspect(errorMessage, invalidBang);

  let searchQuery = $state("");
  let copyIcon: HTMLImageElement;

  $effect(() => {
    if (invalidBang) searchQuery = `!${invalidBang} `;
  });

  function handleSearch(event: Event) {
    event.preventDefault();
    if (searchQuery.trim()) {
      // Redirect back to main page with search query
      window.location.href = `/?q=${encodeURIComponent(searchQuery)}`;
    }
  }

  async function copyToClipboard() {
    const urlInput = document.querySelector(".url-input") as HTMLInputElement;
    await navigator.clipboard.writeText(urlInput.value);
    copyIcon.src = "/clipboard-check.svg";

    setTimeout(() => {
      copyIcon.src = "/clipboard.svg";
    }, 2000);
  }
</script>

<main class="home">
  <div class="container">
    <header class="header">
      <h1 class="title">TODO name</h1>
      <p class="subtitle">
        Based on
        <a
          href="https://duckduckgo.com/bang.html"
          target="_blank"
          rel="noopener"
        >
          DuckDuckGo's bangs
        </a>
        and
        <a
          href="https://github.com/t3dotgg/unduck"
          target="_blank"
          rel="noopener"
        >
          Theo's und*ck
        </a>
      </p>
    </header>

    <!-- {#if errorMessage}
      <div class="error-message">
        <p>⚠️ {errorMessage}</p>
        <p>
          You can search manually below or
          <a href="/settings" class="link-button" {@attach useLink()}>
            customize your bangs.
          </a>
        </p>
      </div>
    {/if} -->

    <section class="search-section">
      <form onsubmit={handleSearch} class="search-form">
        <input
          bind:value={searchQuery}
          type="text"
          class="search-input"
          placeholder="Enter your search query (with !bang or without)"
        />
        <button type="submit" class="search-button">Search</button>
      </form>
    </section>

    <section class="url-section">
      <h2>Custom Search Engine URL</h2>
      <div class="url-container">
        <input
          type="text"
          class="url-input"
          value="{import.meta.env.DEV
            ? 'http://localhost:5173'
            : 'https://unduck.link'}?q=%s"
          readonly
        />
        <button class="copy-button" onclick={copyToClipboard}>
          <img bind:this={copyIcon} src="/clipboard.svg" alt="Copy" />
        </button>
      </div>
    </section>

    <nav class="navigation">
      <a href="/settings" class="nav-button" {@attach useLink()}>
        ⚙️ Settings
      </a>
    </nav>
  </div>

  <footer class="footer">
    <a href="https://t3.chat" target="_blank" rel="noopener"> t3.chat </a>
    •
    <a href="https://x.com/theo" target="_blank" rel="noopener"> theo </a>
    •
    <a href="https://github.com/t3dotgg/unduck" target="_blank" rel="noopener">
      github
    </a>
  </footer>
</main>

<style>
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
  }

  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.6;
  }

  .subtitle a {
    color: #0066cc;
    text-decoration: none;
  }

  .subtitle a:hover {
    text-decoration: underline;
  }

  /* .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 2rem;
    text-align: center;
    color: #dc2626;
  }

  .link-button {
    background: none;
    border: none;
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  } */

  .search-section,
  .url-section {
    width: 100%;
    margin-bottom: 2rem;
  }

  /* .search-section h2, */
  .url-section h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .search-form {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
  }

  .search-button {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 500;
  }

  .search-button:hover {
    background: #2563eb;
  }

  .url-container {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .url-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    background: #f9fafb;
  }

  .copy-button {
    padding: 0.75rem;
    background: #f3f4f6;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-button:hover {
    background: #e5e7eb;
  }

  .copy-button img {
    width: 20px;
    height: 20px;
  }

  .navigation {
    margin-top: 2rem;
  }

  .nav-button {
    padding: 0.75rem 1.5rem;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
  }

  .nav-button:hover {
    background: #4b5563;
  }

  .footer {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .footer a {
    color: #6b7280;
    text-decoration: none;
  }

  .footer a:hover {
    color: #374151;
    text-decoration: underline;
  }

  @media (prefers-color-scheme: dark) {
    .subtitle {
      color: #9ca3af;
    }

    .subtitle a {
      color: #60a5fa;
    }

    /* .error-message {
      background: #1f1917;
      border-color: #dc2626;
      color: #f87171;
    } */

    .search-input,
    .url-input {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }

    .copy-button {
      background: #374151;
      border-color: #4b5563;
    }

    .copy-button:hover {
      background: #4b5563;
    }

    .url-input {
      background: #111827;
    }

    .footer a:hover {
      color: #d1d5db;
    }
  }
</style>
