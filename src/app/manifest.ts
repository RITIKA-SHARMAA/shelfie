import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shelfie",
    short_name: "Shelfie",
    description: "A calm reading shelf with AI suggestions for what to read next.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ede4",
    theme_color: "#f2ede4",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
