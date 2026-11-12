import type { Metadata, Viewport } from "next";
import { Heebo, Rubik } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

// Headings and prices: a clean sans (no serif). Body text stays Heebo.
const heading = Rubik({ variable: "--font-heading", weight: ["300", "400", "500", "700"], subsets: ["hebrew", "latin"] });
const heebo = Heebo({ variable: "--font-heebo", weight: ["300", "400", "500"], subsets: ["hebrew", "latin"] });

const TITLE = "משה שניאור · RE/MAX טאבו נכסים";
/** The home page in Google and in link previews (the owner's wording). Inner pages: "<page> | TITLE". */
const HOME_TITLE = "RE/MAX טאבו נכסים | נכסים למכירה בירושלים";
const DESCRIPTION = "בתים למכירה בירושלים, RE/MAX טאבו נכסים | משה שניאור";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s | ${TITLE}` },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: TITLE,
    title: HOME_TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-office.png", width: 1200, height: 630, alt: "RE/MAX טאבו נכסים" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1a3a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: page changes jump to the top at once (a smooth scroll there would fight
    // the page transition). suppressHydrationWarning: the script below sets data-js and data-header before React starts.
    <html lang="he" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning className={`${heading.variable} ${heebo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        {/* Before the first paint: JavaScript is running (data-js: phones may fold the list), the home page's
            photo is watched until it is ready to be shown, and the home page (also at /p/<listing>) opens
            with a photo under a clear header. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.dataset.js="1";' +
              // The home page's photo (components/motion/living-hero.tsx) is shown when all its parts have loaded: "on" and it
              // appears already moving. If the styles have shown it by then (three seconds passed, or the visitor asked for
              // less motion), it stays as it is: "still". Image loads do not bubble, hence the capture; this runs on every
              // page because the home page can also be reached without a full load.
              'document.addEventListener("load",function(e){var t=e.target,s=t&&t.closest&&t.closest("[data-parts]");if(!s||s.dataset.live)return;' +
              'if(getComputedStyle(s).opacity!=="0"){s.dataset.live="still";return}' +
              'var m=s.querySelectorAll("img");if(m.length<+s.dataset.parts)return;for(var i=0;i<m.length;i++)if(!m[i].complete||!m[i].naturalWidth)return;s.dataset.live="on"},true);' +
              'if(location.pathname==="/"||location.pathname.indexOf("/p/")===0){document.documentElement.dataset.header="overlay";' +
              // A refresh of the home page opens it from the top. The browser's "stay where you were" is switched off for a
              // reload (not for back and forward), a #listings from the menu is dropped, and for the first moments any scroll
              // that the visitor did not start (the page restoring its old place) is sent back to the top.
              'var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="reload"){history.scrollRestoration="manual";if(location.hash)history.replaceState(null,"",location.pathname+location.search);scrollTo(0,0);' +
              'var g=1,s=function(){g=0};["wheel","touchstart","keydown","mousedown"].forEach(function(e){addEventListener(e,s,{passive:true,once:true})});' +
              'addEventListener("scroll",function(){if(g&&scrollY>0)scrollTo({top:0,behavior:"instant"})},{passive:true});setTimeout(s,2500)}}',
          }}
        />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
