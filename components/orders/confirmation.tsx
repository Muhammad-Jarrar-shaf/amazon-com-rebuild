"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { OrderItems, OrderTotalsList, ShipTo, arrivalText, orderDate, paymentText } from "@/components/orders/order-parts";
import { CheckCircleIcon } from "@/components/icons";
import { useOrders } from "@/lib/orders/store";

/** The confirmation for one order (`/orders/<id>/confirmation`), read from the persisted orders. */
export function Confirmation({ orderId }: { orderId: string }) {
  const hydrated = useOrders((state) => state.hydrated);
  const order = useOrders((state) => state.data.orders.find((candidate) => candidate.id === orderId));
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (order) headingRef.current?.focus();
  }, [order]);

  if (!hydrated) return <div aria-busy="true" className="min-h-[40vh]" />;

  if (!order) {
    return (
      <div data-shell="order-not-found" className="rounded-lg bg-white p-6 md:p-8">
        <h1 className="text-2xl font-bold">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-sm text-muted">Orders are saved in the browser they were placed in. This one isn&apos;t saved here.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/orders" className="inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover">
            View your orders
          </Link>
          <Link href="/" className="inline-flex min-h-[var(--tap)] items-center rounded-full border border-line bg-white px-6 text-sm text-ink hover:bg-page-gray">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article data-shell="confirmation" aria-labelledby="confirmation-heading" className="mx-auto max-w-[800px] rounded-lg bg-white p-4 md:p-8">
      <div className="flex items-start gap-3">
        <CheckCircleIcon className="size-9 shrink-0 text-stock" />
        <div>
          <h1 id="confirmation-heading" ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-stock focus:outline-none">
            Order placed, thank you!
          </h1>
          <p className="mt-1 text-sm">Thanks, {order.shipTo.fullName.split(" ")[0]}. Your order is confirmed.</p>
        </div>
      </div>

      <p data-shell="test-note" className="mt-4 rounded-md bg-page-gray p-3 text-sm">
        This was a <strong>simulated order</strong> created in this browser for the project. Nothing was charged or shipped, and it is not an Amazon order.
      </p>

      <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Order number</dt>
          <dd data-shell="order-number" className="text-base font-bold">
            {order.id}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Placed on</dt>
          <dd>{orderDate(order.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Estimated arrival</dt>
          <dd data-shell="arrival" className="font-bold">
            {arrivalText(order)} <span className="font-normal">({order.delivery.label})</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Payment method (test mode)</dt>
          <dd data-shell="payment-method">{paymentText(order)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Shipping to</dt>
          <dd>
            <ShipTo order={order} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="confirmation-items" className="mt-6">
        <h2 id="confirmation-items" className="text-lg font-bold">
          Items in this order
        </h2>
        <OrderItems order={order} />
        <div className="mt-3 flex justify-end border-t border-line pt-3">
          <OrderTotalsList order={order} />
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover">
          Continue shopping
        </Link>
        <Link href="/orders" className="inline-flex min-h-[var(--tap)] items-center rounded-full border border-line bg-white px-6 text-sm text-ink hover:bg-page-gray">
          View your orders
        </Link>
      </div>
    </article>
  );
}
