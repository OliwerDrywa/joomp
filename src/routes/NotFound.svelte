<script lang="ts">
  import { link } from "@dvcol/svelte-simple-router";
</script>

<main class="not-found">
  <div class="container">
    <div class="content">
      <h1 class="title">404</h1>
      <h2 class="subtitle">Page Not Found</h2>
      <p class="description">
        The page you're looking for doesn't exist in the dashboard.
      </p>
      <a href="/dashboard" use:link class="home-button"> Go to Home </a>
    </div>
  </div>
</main>

<style>
  .not-found {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
  }

  .container {
    text-align: center;
    padding: 2rem;
  }

  .title {
    font-size: 6rem;
    font-weight: 700;
    color: #6b7280;
    margin: 0;
    line-height: 1;
  }

  .subtitle {
    font-size: 2rem;
    font-weight: 600;
    margin: 1rem 0;
    color: #374151;
  }

  .description {
    font-size: 1.1rem;
    color: #6b7280;
    margin-bottom: 2rem;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .home-button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  .home-button:hover {
    background: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .title {
      color: #4b5563;
    }

    .subtitle {
      color: #e5e7eb;
    }

    .description {
      color: #9ca3af;
    }
  }
</style>
