import type { MetadataRoute } from "next";

/** Lets agents add the CRM to their phone's home screen and open it full screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "רימקס טאבו נכסים",
    short_name: "רימקס טאבו",
    description: "מערכת ניהול הקונים, הנכסים והמשימות של רימקס טאבו נכסים",
    lang: "he",
    dir: "rtl",
    start_url: "/buyers",
    display: "standalone",
    background_color: "#003da5",  // the splash screen behind the icon while the app opens
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
