<script lang="ts">
  import KvEditor from "./KVEditor.svelte";

  type Props = {
    errorMessage?: string;
    invalidBang?: string;
    errorType?: string;
  };

  let { errorMessage = "", invalidBang = "", errorType = "" }: Props = $props();

  // Internal state management
  let isEditing = $state(false);
  let editableContent = $state<Record<string, string>>({});

  // Auto-start editing for invalid bang errors
  $effect(() => {
    if (errorType === "invalidBang" && !isEditing) {
      // Small delay to ensure DOM is ready
      startEditing();
    }
  });

  function startEditing() {
    const currentBangs = localStorage?.getItem?.("appNameTODO-bangs");
    if (currentBangs) {
      try {
        editableContent = JSON.parse(currentBangs);
      } catch {
        editableContent = {};
        errorMessage = "Failed to parse custom bangs from localStorage.";
        errorType = "localStorageError";
      }
    } else {
      editableContent = {};
    }
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    editableContent = {};
  }

  function save(content: Record<string, string>) {
    try {
      localStorage?.setItem?.("appNameTODO-bangs", JSON.stringify(content));
      isEditing = false;
      alert("Custom bangs saved successfully!");
    } catch {
      alert("Invalid JSON format. Please check your syntax and try again.");
    }
  }

  async function importDefaults() {
    try {
      const imported = await import("../bangs.min.json");
      editableContent = imported.default;
    } catch {
      alert("Failed to import default bangs.");
    }
  }

  // const placeholderText =
  //   '{"g": "https://www.google.com/search?q={{{s}}}", "gh": "https://github.com/search?q={{{s}}}"}';

  function resetLocalStorageBangs() {
    localStorage?.removeItem?.("appNameTODO-bangs");
    location.reload();
  }

  function scrollToCustomBangs() {
    const customBangsSection = document.querySelector(".custom-bangs-section");
    if (customBangsSection) {
      customBangsSection.scrollIntoView({ behavior: "smooth" });
    }
  }
</script>

<div class="custom-bangs-section">
  <h2>Custom Bangs</h2>

  {#if errorMessage}
    <div class="error-message">
      <p>⚠️ {errorMessage}</p>

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
      {/if}
    </div>
  {/if}

  <p>
    Manage your custom search bangs. These are shortcuts like !g for Google or
    !gh for GitHub.
  </p>

  {#if !isEditing}
    <div class="not-editing">
      <p>
        You can customize your search bangs to add new shortcuts or modify
        existing ones.
      </p>
      <button onclick={startEditing}>✏️ Edit Custom Bangs</button>
    </div>
  {:else}
    <div class="editing">
      <h4>Edit Custom Bangs (JSON Format)</h4>
      <button onclick={importDefaults}>📥 Import Default Bangs</button>

      <KvEditor
        data={editableContent}
        onChange={save}
        onCancel={cancelEditing}
        showCancel={true}
      />
    </div>
  {/if}
</div>

<style>
  .custom-bangs-section {
    margin: 3rem 0;
  }

  h2 {
    margin: 5rem 0 2rem 0;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  h4 {
    margin: 2rem 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 500;
  }

  p {
    margin-bottom: 1.5rem;
    color: var(--text-muted);
  }

  .not-editing,
  .editing {
    margin: 2rem 0;
  }

  /* textarea {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--text-subtle);
    padding: 1.5rem;
    font-size: 0.85rem;
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    width: 100%;
    resize: vertical;
    margin: 1.5rem 0;
    line-height: 1.6;
    transition: border-color 0.2s ease;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-color);
  } */

  button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--text-subtle);
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    margin: 0.5rem 0.5rem 0.5rem 0;
    transition: all 0.2s ease;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }

  @media (prefers-color-scheme: dark) {
    .error-message {
      background: #2d1b1b;
      border: 1px solid #5c2b2b;
    }
  }

  .error-message p {
    color: #c53030;
    margin-bottom: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    .error-message p {
      color: #fc8181;
    }
  }

  .error-message p:last-child {
    margin-bottom: 0;
  }

  .error-action-button {
    background: #e53e3e;
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
    background: #c53030;
  }
</style>
