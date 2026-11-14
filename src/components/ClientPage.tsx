"use client";

import dynamic from "next/dynamic";
import { Logo } from "./Decor";

/**
 * The shelf lives in localStorage, which only exists in the browser, so pages
 * render on the client. The server sends this light splash first.
 */
function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ground text-ink">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="h-[2px] w-24 overflow-hidden bg-line">
          <div className="shimmer h-full w-full" />
        </div>
      </div>
    </div>
  );
}

const views = {
  shelf: dynamic(() => import("./Views").then((m) => m.ShelfView), { ssr: false, loading: Splash }),
  next: dynamic(() => import("./Views").then((m) => m.NextView), { ssr: false, loading: Splash }),
  year: dynamic(() => import("./Views").then((m) => m.YearView), { ssr: false, loading: Splash }),
  library: dynamic(() => import("./Views").then((m) => m.LibraryView), { ssr: false, loading: Splash }),
};

export function ClientPage({ view }: { view: keyof typeof views }) {
  const View = views[view];
  return <View />;
}
