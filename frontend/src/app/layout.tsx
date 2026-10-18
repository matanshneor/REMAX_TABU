import type { Metadata } from "next";
import { Heebo, Secular_One } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

// Display face for page titles, panel titles and key numbers (prices, totals).
const secularOne = Secular_One({
  variable: "--font-display-face",
  weight: "400",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "רימקס טאבו נכסים | CRM",
  description: "מערכת ניהול הקונים, הנכסים והמשימות של רימקס טאבו נכסים",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${secularOne.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
