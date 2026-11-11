import type { Metadata, Viewport } from "next";
import { Heebo, Rubik } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

// Headings and prices: a clean sans (no serif). Body text stays Heebo.
const heading = Rubik({ variable: "--font-heading", weight: ["300", "400"], subsets: ["hebrew", "latin"] });
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
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "RE/MAX טאבו נכסים" }],
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
        {/* Before the first paint: JavaScript is running (data-js: phones may fold the list), and the
            home page (also at /p/<listing>) opens with a photo under a clear header. */}
        <script
          dangerouslySetInnerHTML={{
            __html: 'document.documentElement.dataset.js="1";if(location.pathname==="/"||location.pathname.indexOf("/p/")===0)document.documentElement.dataset.header="overlay"',
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
