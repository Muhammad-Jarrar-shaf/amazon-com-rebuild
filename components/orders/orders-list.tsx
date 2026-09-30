"use client";

import Link from "next/link";
import { OrderItems, ShipTo, arrivalText, orderDate } from "@/components/orders/order-parts";
import { formatMoney } from "@/lib/pricing";
import { useOrders } from "@/lib/orders/store";

/** The orders page body: persisted orders, newest first. */
export function OrdersList() {
  const hydrated = useOrders((state) => state.hydrated);
  const orders = useOrders((state) => state.data.orders);
  const notice = useOrders((state) => state.notice);
  const dismiss = useOrders((state) => state.dismissNotice);

  if (!hydrated) return <div aria-busy="true" className="min-h-[40vh]" />;

  const newestFirst = [...orders].reverse();
  return (
    <div>
      <div role="status" className="empty:hidden">
        {notice && (
          <p data-shell="orders-notice" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-line bg-[#fff8e5] p-3 text-sm">
            <span>{notice}</span>
            <button type="button" onClick={dismiss} className="min-h-[var(--tap)] shrink-0 text-link hover:underline sm:min-h-0">
              Dismiss
            </button>
          </p>
        )}
      </div>
      {newestFirst.length === 0 ? (
        <div data-shell="orders-empty" className="rounded-lg bg-white p-6 md:p-8">
          <h2 className="text-2xl font-bold">You have no orders yet</h2>
          <p className="mt-2 text-sm text-muted">Orders you place appear here. Orders are saved in this browser.</p>
          <Link href="/" className="mt-4 inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover">
            Continue shopping
          </Link>
        </div>
      ) : (
        <ol className="space-y-4">
          {newestFirst.map((order) => (
            <li key={order.id} data-shell="order-card" data-order-id={order.id}>
              <article aria-label={`Order ${order.id}`} className="overflow-hidden rounded-lg border border-line bg-white">
                <header className="grid gap-x-8 gap-y-2 bg-page-gray p-4 text-sm sm:grid-cols-[repeat(4,auto)_1fr] sm:items-start">
                  <div>
                    <p className="text-xs text-muted">ORDER PLACED</p>
                    <p>{orderDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">TOTAL</p>
                    <p data-shell="order-list-total">{formatMoney(order.totalCents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">SHIP TO</p>
                    <p>{order.shipTo.fullName}</p>
                  </div>
                  <div className="sm:col-span-2 sm:text-right">
                    <p className="text-xs text-muted">ORDER #</p>
                    <p data-shell="order-list-id">{order.id}</p>
                  </div>
                </header>
                <div className="p-4">
                  <h2 className="font-bold">
                    Confirmed · arriving {arrivalText(order)} <span className="text-sm font-normal text-muted">(simulated order)</span>
                  </h2>
                  <OrderItems order={order} />
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <ShipTo order={order} />
                    <Link href={`/orders/${order.id}/confirmation`} className="inline-flex min-h-[var(--tap)] items-center rounded-full border border-line bg-white px-5 text-sm text-ink hover:bg-page-gray">
                      View order details
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
      {newestFirst.length > 0 && (
        <p className="mt-6">
          <Link href="/" className="inline-flex min-h-[var(--tap)] items-center text-link hover:underline">
            Continue shopping
          </Link>
        </p>
      )}
    </div>
  );
}
