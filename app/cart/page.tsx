import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Shopping Cart" };

/**
 * The cart page (FR-CART-*). The cart lives in the browser (a client store), so the server only renders the frame;
 * <CartView> reads the store. `data-page="cart"` switches the page background to gray (globals.css).
 */
export default function CartPage() {
  return (
    <div data-page="cart">
      <h1 className="mb-4 text-[28px] leading-tight font-bold">Shopping Cart</h1>
      <CartView />
    </div>
  );
}
