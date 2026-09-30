import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/skip-link";
import { getCartLookup } from "@/lib/cart/server";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <CartProvider lookup={getCartLookup()}>
          <SkipLink />
          <Header />
          <main id="main" className="mx-auto w-full max-w-[var(--shell-max)] flex-1 px-4 py-8">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
