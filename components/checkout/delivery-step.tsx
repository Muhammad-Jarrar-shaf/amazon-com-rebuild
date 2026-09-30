"use client";

import { useEffect } from "react";
import { DEFAULT_DELIVERY, DELIVERY_OPTIONS, arrivalLabel } from "@/lib/checkout/delivery";
import { checkoutStore, useCheckout } from "@/lib/checkout/store";
import { formatMoney } from "@/lib/pricing";

/** Step 2: three fixed delivery options. Standard is preselected; the choice updates the summary immediately. */
export function DeliveryStep({ now, onDone }: { now: Date; onDone: () => void }) {
  const selected = useCheckout((current) => current.state.deliveryId);

  useEffect(() => {
    if (!checkoutStore.getState().state.deliveryId) checkoutStore.getState().setDelivery(DEFAULT_DELIVERY);
  }, []);

  const current = selected ?? DEFAULT_DELIVERY;
  return (
    <form
      aria-label="Delivery options"
      onSubmit={(event) => {
        event.preventDefault();
        checkoutStore.getState().setDelivery(current);
        onDone();
      }}
    >
      <fieldset>
        <legend className="text-sm text-muted">Choose how quickly you want your order. These are this project&apos;s mock delivery options.</legend>
        <div className="mt-3 space-y-3">
          {DELIVERY_OPTIONS.map((option) => {
            const checked = current === option.id;
            return (
              <label
                key={option.id}
                data-shell="delivery-option"
                className={`flex min-h-[var(--tap)] cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link ${
                  checked ? "border-thumb bg-[#fef8f0]" : "border-line bg-white hover:bg-page-gray"
                }`}
              >
                <input type="radio" name="delivery" value={option.id} checked={checked} onChange={() => checkoutStore.getState().setDelivery(option.id)} className="mt-1 size-5 accent-[#e77600]" />
                <span className="flex-1">
                  <span className="block font-bold">{option.label}</span>
                  <span className="block text-sm text-muted">Arrives {arrivalLabel(option, now)}</span>
                </span>
                <span className="font-bold">{option.priceCents === 0 ? "FREE" : formatMoney(option.priceCents)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <button type="submit" className="mt-5 min-h-[var(--tap)] w-full rounded-full bg-cta px-8 py-2.5 text-sm text-ink hover:bg-cta-hover sm:w-auto">
        Continue to payment
      </button>
    </form>
  );
}
