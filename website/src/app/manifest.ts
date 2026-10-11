import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sangam Setu · Matrimony for families",
    short_name: "Sangam Setu",
    description: "Biodatas, matches that explain themselves, free Guna Milan and a family review panel.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff5e8",
    theme_color: "#9e0038",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Discover", url: "/discover" },
      { name: "Chats", url: "/chat" },
      { name: "Guna Milan", url: "/kundli" },
    ],
  };
}
