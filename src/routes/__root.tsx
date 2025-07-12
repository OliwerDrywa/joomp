import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { type } from "arktype";
// @ts-ignore -- directives get marked as unused variables
import { getStyles, pixelsAnimation } from "@/lib/pixelAnimations";

export const Route = createRootRouteWithContext()({
  component: RootComponent,
  validateSearch: type({
    via: "string = 'eJwDAAAAAAE'",
    "notFound?": "string",
  }),
});

function RootComponent() {
  const search = Route.useSearch();

  return (
    <>
      <div class="mx-auto flex h-[100dvh] max-w-3xl flex-col gap-[6dvh] pt-8 pb-2 text-lg text-gray-700 dark:text-gray-200">
        <header class="mx-auto">
          <AsciiTitle />

          <nav class="flex justify-center gap-[3vw] uppercase">
            <Link search={search()} to="/">
              learn more
            </Link>
            <Link search={search()} to="/edit">
              personalize
            </Link>
            <Link search={search()} to="/test">
              test it out
            </Link>
          </nav>
        </header>

        <main
          class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[4dvh] overflow-y-scroll"
          style="view-transition-name: main-content;"
        >
          <Outlet />
        </main>

        <footer class="mx-auto">something • cool • github</footer>
      </div>
      <TanStackRouterDevtools />
    </>
  );
}

function AsciiTitle() {
  return (
    <h1
      class="inline-block text-xs leading-3 select-none sm:text-sm sm:leading-3.5 md:text-base md:leading-4 lg:text-lg lg:leading-4.5 xl:text-xl xl:leading-5 2xl:text-2xl 2xl:leading-6"
      style="font-family: 'Lucida Console'"
    >
      {`                                                 
       ██╗ ██████╗  ██████╗ ███╗   ███╗██████╗   
       ██║██╔═══██╗██╔═══██╗████╗ ████║██╔══██╗  
       ██║██║   ██║██║   ██║██╔████╔██║██████╔╝  
  ██   ██║██║   ██║██║   ██║██║╚██╔╝██║██╔═══╝   
  ╚█████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║       
   ╚════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝       
                                                 `
        .split("\n")
        .flatMap((l) => [
          l.split("").map((c) => (
            <span
              use:pixelsAnimation={getStyles()}
              class="hover transition delay-500 duration-500 hover:delay-0 hover:duration-0"
            >
              {c !== " " ? c : String.fromCharCode(160)}
            </span>
          )),
          <br />,
        ])}
    </h1>
  );
}
