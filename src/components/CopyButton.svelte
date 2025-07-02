<script lang="ts">
  type Props = {
    textToCopy: string;
  };

  let { textToCopy }: Props = $props();

  let copyIcon: HTMLImageElement;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(textToCopy);
    copyIcon.src = "/clipboard-check.svg";

    setTimeout(() => {
      copyIcon.src = "/clipboard.svg";
    }, 2000);
  }
</script>

<button onclick={copyToClipboard}>
  <img bind:this={copyIcon} src="/clipboard.svg" alt="Copy" />
</button>

<style>
  button {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--text-subtle);
    padding: 0.5rem;
    margin-left: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--accent-light);
  }

  button:hover {
    border-color: var(--accent-color);
    background: var(--accent-color);
  }

  button img {
    width: 16px;
    height: 16px;
    opacity: 0.8;
    filter: brightness(0) saturate(100%) invert(100%);
  }

  @media (prefers-color-scheme: light) {
    button img {
      filter: brightness(0) saturate(100%) invert(0%);
    }

    button:hover img {
      filter: brightness(0) saturate(100%) invert(100%);
    }
  }
</style>
