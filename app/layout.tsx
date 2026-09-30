import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/skip-link";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#131921",
};

// Temporary S0 landmarks; S1 replaces the header and footer with the real shell.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        <header className="bg-nav text-white">
          <div className="mx-auto flex h-[60px] w-full max-w-[1500px] items-center px-4">
            <span className="text-xl font-bold">{SITE.name}</span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="bg-subnav text-white">
          <p className="mx-auto w-full max-w-[1500px] px-4 py-6 text-sm">
            An assignment project. Not affiliated with or endorsed by Amazon.
          </p>
        </footer>
      </body>
    </html>
  );
}
