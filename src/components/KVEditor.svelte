<script lang="ts">
  type Props = {
    data: Record<string, string>;
    onChange: (data: Record<string, string>) => void;
    onCancel?: () => void;
    showCancel?: boolean;
  };

  let { data, onChange, onCancel, showCancel = false }: Props = $props();

  // Internal state for editing
  let entries = $state<Array<{ key: string; value: string; id: string }>>([]);
  let searchTerm = $state("");
  let hasUnsavedChanges = $state(false);

  // Virtualization state
  let scrollContainer: HTMLDivElement;
  let scrollTop = $state(0);
  let containerHeight = $state(400); // Default container height
  const itemHeight = 60; // Height of each entry row (including margin)
  const overscan = 5; // Number of items to render beyond visible area

  // Initialize entries from data, combining duplicate values
  $effect(() => {
    const valueToKeys = new Map<string, string[]>();

    // Group keys by their values
    Object.entries(data).forEach(([key, value]) => {
      if (!valueToKeys.has(value)) {
        valueToKeys.set(value, []);
      }
      valueToKeys.get(value)!.push(key);
    });

    // Create entries with combined keys for duplicate values
    const combinedEntries: Array<{ key: string; value: string; id: string }> =
      [];
    valueToKeys.forEach((keys, value) => {
      const combinedKey = keys.length > 1 ? keys.join(", ") : keys[0];
      combinedEntries.push({
        key: combinedKey,
        value,
        id: `${value}-${keys.join("-")}-${Date.now()}`,
      });
    });

    entries = combinedEntries;
  });

  // Fuzzy search function
  function fuzzyMatch(
    text: string,
    query: string,
  ): { matches: boolean; score: number } {
    if (!query) return { matches: true, score: 0 };

    text = text.toLowerCase();
    query = query.toLowerCase();

    // Perfect match gets highest score
    if (text === query) return { matches: true, score: 1000 };

    // Starts with query gets very high score
    if (text.startsWith(query))
      return { matches: true, score: 500 + (query.length / text.length) * 100 };

    // Contains query gets high score
    if (text.includes(query))
      return { matches: true, score: 200 + (query.length / text.length) * 100 };

    // Fuzzy matching - each character in query must appear in order
    let textIndex = 0;
    let queryIndex = 0;
    let matchedChars = 0;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        matchedChars++;
        queryIndex++;
      }
      textIndex++;
    }

    if (queryIndex === query.length) {
      // All query characters found in order
      const score = (matchedChars / text.length) * 50;
      return { matches: true, score };
    }

    return { matches: false, score: 0 };
  }

  // Detect duplicate keys (considering combined keys)
  let duplicateKeys = $derived.by(() => {
    const keyCount = new Map<string, number>();

    entries.forEach((entry) => {
      // Split combined keys and count each individually
      const keys = entry.key
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k);
      keys.forEach((key) => {
        keyCount.set(key, (keyCount.get(key) || 0) + 1);
      });
    });

    const duplicates = new Set<string>();
    keyCount.forEach((count, key) => {
      if (count > 1) {
        duplicates.add(key);
      }
    });

    return duplicates;
  });

  // Check if an entry has any duplicate keys
  function isDuplicateKey(entry: {
    key: string;
    value: string;
    id: string;
  }): boolean {
    const keys = entry.key
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);
    return keys.some((key) => duplicateKeys.has(key));
  }

  // Check if there are any duplicate keys
  let hasDuplicates = $derived(duplicateKeys.size > 0);

  // Filtered and sorted entries based on search
  let filteredEntries = $derived.by(() => {
    if (!searchTerm.trim()) return entries;

    const matches = entries
      .map((entry) => {
        // For combined keys, check each key individually
        const keys = entry.key.split(",").map((k) => k.trim());
        const keyMatches = keys.map((key) => fuzzyMatch(key, searchTerm));
        const bestKeyMatch = keyMatches.reduce(
          (best, current) => (current.score > best.score ? current : best),
          { matches: false, score: 0 },
        );

        const valueMatch = fuzzyMatch(entry.value, searchTerm);

        if (bestKeyMatch.matches || valueMatch.matches) {
          // Prioritize key matches over value matches
          const score = bestKeyMatch.matches
            ? bestKeyMatch.score + 1000
            : valueMatch.score;
          return { entry, score };
        }
        return null;
      })
      .filter(
        (item): item is { entry: (typeof entries)[0]; score: number } =>
          item !== null,
      )
      .sort((a, b) => {
        // First sort by score (descending)
        if (b.score !== a.score) return b.score - a.score;
        // Then by key length (ascending) - shorter keys first
        if (a.entry.key.length !== b.entry.key.length) {
          return a.entry.key.length - b.entry.key.length;
        }
        // Finally alphabetically
        return a.entry.key.localeCompare(b.entry.key);
      });

    return matches.map((item) => item.entry);
  });

  // Virtual scrolling calculations
  let visibleRange = $derived.by(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan,
    );
    const endIndex = Math.min(
      filteredEntries.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan,
    );
    return { startIndex, endIndex };
  });

  let visibleItems = $derived(
    filteredEntries
      .slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        ...item,
        index: visibleRange.startIndex + index,
        absoluteIndex: visibleRange.startIndex + index,
      })),
  );

  let totalHeight = $derived(filteredEntries.length * itemHeight);
  let offsetY = $derived(visibleRange.startIndex * itemHeight);

  // Handle scroll events
  function handleScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    scrollTop = target.scrollTop;
  }

  // Update container height when element is mounted/resized
  $effect(() => {
    if (scrollContainer) {
      const updateHeight = () => {
        containerHeight = scrollContainer.clientHeight;
      };

      updateHeight();

      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(scrollContainer);

      return () => {
        resizeObserver.disconnect();
      };
    }
  });

  function addRow() {
    const newEntry = {
      key: "",
      value: "",
      id: `new-${Date.now()}-${Math.random()}`,
    };
    entries = [...entries, newEntry];
    hasUnsavedChanges = true;
  }

  function removeRow(id: string) {
    entries = entries.filter((entry) => entry.id !== id);
    hasUnsavedChanges = true;
  }

  function updateEntry(id: string, field: "key" | "value", newValue: string) {
    entries = entries.map((entry) =>
      entry.id === id ? { ...entry, [field]: newValue } : entry,
    );
    hasUnsavedChanges = true;
  }

  function save() {
    // Convert entries back to object, handling combined keys
    const result: Record<string, string> = {};
    entries.forEach((entry) => {
      if (entry.key.trim() && entry.value.trim()) {
        // Split combined keys and create separate entries for each
        const keys = entry.key
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        keys.forEach((key) => {
          if (key) {
            result[key] = entry.value;
          }
        });
      }
    });

    onChange(result);
    hasUnsavedChanges = false;
  }

  function cancel() {
    if (onCancel) {
      onCancel();
    }
    hasUnsavedChanges = false;
  }

  function handleKeyInput(event: Event, id: string) {
    const target = event.target as HTMLInputElement;
    updateEntry(id, "key", target.value);
  }

  function handleValueInput(event: Event, id: string) {
    const target = event.target as HTMLInputElement;
    updateEntry(id, "value", target.value);
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    searchTerm = target.value;

    // Jump scroll position to the beginning when searching
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollTop = 0;
    }
  }
</script>

<div class="kv-editor">
  <div class="header">
    <h3>Key-Value Editor</h3>
    <div class="search-container">
      <input
        type="text"
        placeholder="Search keys or values..."
        value={searchTerm}
        oninput={handleSearchInput}
        class="search-input"
      />
    </div>
  </div>

  <div
    class="entries-container"
    bind:this={scrollContainer}
    onscroll={handleScroll}
  >
    {#if filteredEntries.length === 0}
      <div class="empty-state">
        {#if searchTerm}
          <p>No entries match your search.</p>
        {:else}
          <p>No entries yet. Add one to get started!</p>
        {/if}
      </div>
    {:else}
      <div class="virtual-list" style="height: {totalHeight}px;">
        <div class="virtual-items" style="transform: translateY({offsetY}px);">
          {#each visibleItems as entry (entry.id)}
            <div class="entry-row" style="height: {itemHeight}px;">
              <input
                type="text"
                placeholder="Key(s) - separate multiple with commas"
                value={entry.key}
                oninput={(e) => handleKeyInput(e, entry.id)}
                class="key-input {isDuplicateKey(entry)
                  ? 'duplicate-key'
                  : ''} {entry.key.includes(',') ? 'combined-keys' : ''}"
                title={isDuplicateKey(entry)
                  ? "Duplicate key detected"
                  : entry.key.includes(",")
                    ? "Multiple keys with same value"
                    : ""}
              />
              <input
                type="text"
                placeholder="Value"
                value={entry.value}
                oninput={(e) => handleValueInput(e, entry.id)}
                class="value-input"
              />
              <button
                onclick={() => removeRow(entry.id)}
                class="remove-button"
                title="Remove entry"
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="actions">
    <button onclick={addRow} class="add-button"> + Add Row </button>

    <div class="save-section">
      {#if hasDuplicates}
        <span class="duplicate-warning">⚠️ Duplicate keys detected</span>
      {:else if hasUnsavedChanges}
        <span class="unsaved-indicator">⚠️ Unsaved changes</span>
      {/if}
      <div class="button-group">
        {#if showCancel}
          <button onclick={cancel} class="cancel-button"> Cancel </button>
        {/if}
        <button
          onclick={save}
          class="save-button"
          disabled={!hasUnsavedChanges || hasDuplicates}
          title={hasDuplicates ? "Cannot save with duplicate keys" : ""}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .kv-editor {
    border: 1px solid var(--text-subtle);
    border-radius: 8px;
    padding: 1.5rem;
    background: var(--bg-color, transparent);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--text-color);
  }

  .search-container {
    flex: 1;
    max-width: 300px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--text-subtle);
    border-radius: 4px;
    background: transparent;
    color: var(--text-color);
    font-size: 0.9rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .entries-container {
    margin-bottom: 1.5rem;
    height: 400px; /* Fixed height for virtualization */
    overflow-y: auto;
    border: 1px solid var(--text-subtle);
    border-radius: 4px;
    position: relative;
  }

  .virtual-list {
    position: relative;
    width: 100%;
  }

  .virtual-items {
    position: relative;
    width: 100%;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-style: italic;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .entry-row {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 0.75rem;
    padding: 0.75rem;
    align-items: center;
    box-sizing: border-box;
    border-bottom: 1px solid var(--text-subtle);
  }

  .entry-row:last-child {
    border-bottom: none;
  }

  .key-input,
  .value-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--text-subtle);
    border-radius: 4px;
    background: transparent;
    color: var(--text-color);
    font-size: 0.9rem;
  }

  .key-input:focus,
  .value-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .key-input.duplicate-key {
    border-color: #e53e3e;
    background-color: rgba(229, 62, 62, 0.1);
  }

  .key-input.duplicate-key:focus {
    border-color: #c53030;
    box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.2);
  }

  .key-input.combined-keys {
    border-color: #8b5cf6;
    background-color: rgba(139, 92, 246, 0.05);
  }

  .key-input.combined-keys:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  .remove-button {
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    transition: background-color 0.2s ease;
  }

  .remove-button:hover {
    background: #c53030;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--text-subtle);
  }

  .add-button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--text-subtle);
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .add-button:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  .save-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
  }

  .cancel-button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--text-subtle);
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    border-color: var(--text-color);
    background: var(--text-subtle);
  }

  .unsaved-indicator {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .duplicate-warning {
    color: #e53e3e;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .save-button {
    background: var(--accent-color, #007acc);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: opacity 0.2s ease;
  }

  .save-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .save-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-container {
      max-width: none;
    }

    .entries-container {
      height: 300px; /* Smaller height on mobile */
    }

    .entry-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .remove-button {
      justify-self: end;
    }

    .actions {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .save-section {
      justify-content: center;
    }

    .button-group {
      flex-direction: column;
      width: 100%;
    }

    .cancel-button,
    .save-button {
      width: 100%;
    }
  }
</style>
