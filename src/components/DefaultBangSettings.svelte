<script lang="ts">
  let localValue = $state(
    localStorage?.getItem?.("appNameTODO-default-bang") ?? "g",
  );

  function handleSave() {
    if (localValue.trim()) {
      localStorage?.setItem?.("appNameTODO-default-bang", localValue.trim());
      localValue = localValue.trim();
      alert(
        "Settings saved! Your new default bang will be used for future searches.",
      );
    }
  }
</script>

<div class="default-bang-section">
  <h2>Default Bang</h2>
  <p>
    Choose which search engine to use when no bang is specified in your query.
    Popular options: g (Google), ddg (DuckDuckGo), b (Bing)
  </p>

  <label for="default-bang">Default Bang:</label>
  <span>!</span>
  <input
    id="default-bang"
    bind:value={localValue}
    type="text"
    placeholder="g"
  />

  <button onclick={handleSave}>Save Settings</button>
</div>

<style>
  .default-bang-section {
    margin: 3rem 0;
  }

  h2 {
    margin: 5rem 0 2rem 0;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  h2:first-of-type {
    margin-top: 3rem;
  }

  p {
    margin-bottom: 1.5rem;
    color: var(--text-muted);
  }

  label {
    font-weight: 500;
    margin-right: 0.75rem;
    color: var(--text-color);
  }

  input[type="text"] {
    background: transparent;
    color: var(--text-color);
    border: none;
    border-bottom: 1px solid var(--text-subtle);
    padding: 0.75rem 0;
    font-size: 1rem;
    margin: 1rem 0 2rem 0;
    width: 100%;
    max-width: 400px;
    transition: border-color 0.2s ease;
  }

  input[type="text"]:focus {
    outline: none;
    border-bottom-color: var(--accent-color);
  }

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
</style>
