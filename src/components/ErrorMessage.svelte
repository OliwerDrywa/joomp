<script lang="ts">
  type Props = {
    message: string;
    invalidBang?: string;
    errorType?: string;
    resetLocalStorageBangs?: () => void;
    scrollToCustomBangs?: () => void;
  };

  let {
    message,
    invalidBang = "",
    errorType = "",
    resetLocalStorageBangs,
    scrollToCustomBangs,
  }: Props = $props();
</script>

{#if message}
  <div class="error-message">
    <p>⚠️ {message}</p>

    {#if errorType === "localStorageError"}
      <p>
        This could be due to corrupted data or browser restrictions. You can
        reset your custom bangs to the default settings to resolve this issue.
      </p>
      <button onclick={resetLocalStorageBangs} class="error-action-button">
        🔄 Reset to Default Bangs
      </button>
    {:else if errorType === "invalidBang" && invalidBang}
      <p>
        The bang "!{invalidBang}" doesn't exist in your current settings. You
        can add it to your custom bangs below if you'd like to use it.
      </p>
      <button onclick={scrollToCustomBangs} class="error-action-button">
        ➕ Add Custom Bang
      </button>
    {:else if invalidBang}
      <p>Invalid bang: !{invalidBang}</p>
      <p>
        You can customize your bangs in the settings panel below, or the search
        will use your default bang.
      </p>
    {:else}
      <p>
        You can customize your bangs in the settings panel below, or the search
        will use your default bang.
      </p>
    {/if}
  </div>
{/if}

<style>
  .error-message {
    margin: 2rem 0;
    padding: 1.5rem 0;
    border-top: 1px solid var(--text-subtle);
    border-bottom: 1px solid var(--text-subtle);
  }

  .error-message p {
    color: var(--text-color);
    margin-bottom: 0.75rem;
  }

  .error-message p:last-child {
    margin-bottom: 0;
  }

  .error-action-button {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: 1rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .error-action-button:hover {
    background: var(--accent-hover);
  }
</style>
