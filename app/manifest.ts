import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ひとこと箱",
    short_name: "ひとこと箱",
    description: "ひとことを静かに残すための家族用インボックス",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#9b6f5f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
