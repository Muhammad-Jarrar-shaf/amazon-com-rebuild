import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = { title: "Checkout" };
// The pinned test clock (APP_FIXED_NOW) is read per request, never frozen at build time.
export const dynamic = "force-dynamic";

/**
 * Guest checkout (FR-CHK-*): a designed, deterministic mock flow, not Amazon's. The cart, checkout progress and orders
 * live in the browser, so the server only supplies the pinned clock (null in production: the real time is used).
 */
export default function CheckoutPage() {
  const pinned = process.env.APP_FIXED_NOW;
  const fixedNow = pinned && !Number.isNaN(new Date(pinned).getTime()) ? pinned : null;
  return (
    <div data-page="checkout" className="mx-auto max-w-[1100px]">
      <h1 className="mb-4 text-[28px] leading-tight font-bold">Checkout</h1>
      <Suspense fallback={<div aria-busy="true" className="min-h-[40vh]" />}>
        <CheckoutFlow fixedNow={fixedNow} />
      </Suspense>
    </div>
  );
}
