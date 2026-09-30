import type { Metadata } from "next";
import { OrdersList } from "@/components/orders/orders-list";

export const metadata: Metadata = { title: "Your Orders" };

/** Orders placed in this browser (FR-ORD-3), read from localStorage: the server only renders the frame. */
export default function OrdersPage() {
  return (
    <div data-page="orders" className="mx-auto max-w-[1100px]">
      <h1 className="mb-4 text-[28px] leading-tight font-bold">Your Orders</h1>
      <OrdersList />
    </div>
  );
}
