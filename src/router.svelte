<script lang="ts">
  import { RouterView } from "@dvcol/svelte-simple-router/components";

  import Home from "./routes/Home.svelte";
  import Settings from "./routes/Settings.svelte";
  import NotFound from "./routes/NotFound.svelte";

  let errorMessage = $state("");
  let invalidBang = $state("");

  $effect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    const bang = url.searchParams.get("bang");

    if (error === "invalid-bang" && bang) {
      errorMessage = `Bang "${bang}" was not found`;
      invalidBang = bang;
    }
  });
</script>

<div class="dashboard">
  <RouterView
    options={{
      routes: [
        {
          name: "dashboard",
          path: "/dashboard",
          component: Home,
          props: { errorMessage, invalidBang },
        },
        {
          name: "settings",
          path: "/settings",
          component: Settings,
          props: { errorMessage, invalidBang },
        },
        {
          name: "not-found",
          path: "*",
          component: NotFound,
        },
      ],
    }}
  />
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background: var(--bg-color, #ffffff);
    color: var(--text-color, #000000);
  }

  @media (prefers-color-scheme: dark) {
    .dashboard {
      --bg-color: #131313;
      --text-color: #ffffff;
    }
  }
</style>
