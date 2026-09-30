import { formatDeliveryDate } from "@/lib/delivery";
import { formatMoney } from "@/lib/pricing";
import { maskedCard } from "@/lib/checkout/payment";
import type { Order } from "@/lib/orders/types";

const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export const orderDate = (iso: string): string => dateFormat.format(new Date(iso));
export const arrivalText = (order: Order): string => formatDeliveryDate(new Date(order.delivery.estimatedArrivalIso));

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-line">
      {order.items.map((item) => (
        <li key={`${item.productId}/${item.variantId}`} data-shell="order-item" className="flex justify-between gap-4 py-2 text-sm">
          <span className="min-w-0">
            <span className="block">{item.title}</span>
            <span className="block text-xs text-muted">
              {item.variantText ? `${item.variantText} · ` : ""}Qty {item.quantity} × {formatMoney(item.unitPriceCents)}
            </span>
          </span>
          <span className="shrink-0">{formatMoney(item.lineTotalCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsList({ order }: { order: Order }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
      <dt>Items:</dt>
      <dd>{formatMoney(order.subtotalCents)}</dd>
      <dt>Delivery ({order.delivery.label.replace(" delivery", "")}):</dt>
      <dd>{order.shippingCents === 0 ? "FREE" : formatMoney(order.shippingCents)}</dd>
      <dt>Estimated tax:</dt>
      <dd>{formatMoney(order.taxCents)}</dd>
      <dt className="pt-1 text-base font-bold">Order total:</dt>
      <dd data-shell="order-total" className="pt-1 text-base font-bold">
        {formatMoney(order.totalCents)}
      </dd>
    </dl>
  );
}

export function ShipTo({ order }: { order: Order }) {
  const { fullName, street, city, state, zip } = order.shipTo;
  return (
    <address className="text-sm not-italic">
      {fullName}
      <br />
      {street}
      <br />
      {city}, {state} {zip}
    </address>
  );
}

export const paymentText = (order: Order): string => maskedCard(order.payment);
