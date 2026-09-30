"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddressStep } from "@/components/checkout/address-step";
import { DeliveryStep } from "@/components/checkout/delivery-step";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentStep } from "@/components/checkout/payment-step";
import { ReviewStep } from "@/components/checkout/review-step";
import { useCheckoutModel } from "@/components/checkout/use-checkout-model";
import { canEnterStep, firstIncompleteStep, isStepComplete, missingStepMessage, nextStep, parseStep, stepHref } from "@/lib/checkout/state";
import { checkoutStore, useCheckout } from "@/lib/checkout/store";
import { CHECKOUT_STEPS, STEP_LABELS, type CheckoutStep } from "@/lib/checkout/types";

const HEADINGS: Record<CheckoutStep, string> = {
  address: "1. Shipping address",
  delivery: "2. Delivery options",
  payment: "3. Payment method",
  review: "4. Review your order",
};

function EmptyCheckout() {
  return (
    <div data-shell="checkout-empty" className="rounded-lg bg-white p-6 md:p-8">
      <h2 className="text-2xl font-bold">Your cart is empty</h2>
      <p className="mt-2 text-sm text-muted">There is nothing to check out yet. Add something to your cart first.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover">
          Continue shopping
        </Link>
        <Link href="/cart" className="inline-flex min-h-[var(--tap)] items-center rounded-full border border-line bg-white px-6 text-sm text-ink hover:bg-page-gray">
          Go to Cart
        </Link>
      </div>
    </div>
  );
}

/**
 * The /checkout stepper. The step lives in the URL (`?step=`), the entered data in the persisted checkout store, so a
 * reload or Back/Forward lands on the right step with the data intact. A step whose earlier steps are incomplete is
 * never rendered: the URL is replaced with the first incomplete step and the shopper is told why.
 */
export function CheckoutFlow({ fixedNow }: { fixedNow: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = parseStep(params.get("step"));
  const model = useCheckoutModel();
  const recovered = useCheckout((current) => current.recovered);
  const [placing, setPlacing] = useState(false);
  const notice = useCheckout((current) => current.notice);
  const now = useMemo(() => (fixedNow ? new Date(fixedNow) : new Date()), [fixedNow]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const { ready, state } = model;
  const empty = ready && model.cart.views.length === 0;
  const target = firstIncompleteStep(state);
  const allowed = requested !== null && canEnterStep(state, requested);

  useEffect(() => {
    if (!ready || empty || placing) return;
    if (requested === null) {
      router.replace(stepHref(target));
    } else if (!allowed) {
      checkoutStore.getState().setNotice(missingStepMessage(state, requested));
      router.replace(stepHref(target));
    }
  }, [ready, empty, placing, requested, allowed, target, state, router]);

  // Move focus to the step heading when the step changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (allowed) headingRef.current?.focus();
  }, [requested, allowed]);

  if (!ready) return <div aria-busy="true" className="min-h-[40vh]" />;
  // The order is saved and the cart cleared: Place order is gone (it cannot be activated again) until the
  // confirmation replaces this announcement.
  if (placing) {
    return (
      <div role="status" aria-busy="true" data-shell="placing-order" className="min-h-[40vh] rounded-lg bg-white p-6 text-lg font-bold">
        Placing your order…
      </div>
    );
  }
  if (empty) return <EmptyCheckout />;
  if (requested === null || !allowed) return <div aria-busy="true" className="min-h-[40vh]" />;

  const go = (step: CheckoutStep) => {
    checkoutStore.getState().setNotice(null);
    router.push(stepHref(step));
  };
  const step: CheckoutStep = requested;

  return (
    <div>
      {recovered && (
        <p data-shell="checkout-recovered" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-line bg-[#fff8e5] p-3 text-sm">
          <span>Your saved checkout details could not be read, so checkout was reset. Please enter them again.</span>
          <button type="button" onClick={() => checkoutStore.getState().dismissRecovered()} className="min-h-[var(--tap)] shrink-0 text-link hover:underline sm:min-h-0">
            Dismiss
          </button>
        </p>
      )}
      <nav aria-label="Checkout steps" className="mb-4">
        <ol className="flex gap-1 text-xs sm:gap-3 sm:text-sm">
          {CHECKOUT_STEPS.map((candidate, index) => {
            const current = candidate === step;
            const reachable = canEnterStep(state, candidate);
            const done = isStepComplete(state, candidate) && !current;
            const label = (
              <span className={`flex items-center gap-1.5 ${current ? "font-bold text-ink" : "text-muted"}`}>
                <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${current ? "border-ink bg-ink text-white" : done ? "border-stock text-stock" : "border-line"}`}>
                  {done ? "✓" : index + 1}
                </span>
                {STEP_LABELS[candidate]}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
            );
            return (
              <li key={candidate} className="flex-1" aria-current={current ? "step" : undefined}>
                {reachable && !current ? (
                  <Link href={stepHref(candidate)} className="flex min-h-[var(--tap)] items-center rounded-md px-1 hover:bg-white sm:min-h-9">
                    {label}
                  </Link>
                ) : (
                  <span className="flex min-h-[var(--tap)] items-center px-1 sm:min-h-9">{label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="checkout-step-heading" data-shell="checkout-step" data-step={step} className="rounded-lg bg-white p-4 md:p-6">
          <h2 id="checkout-step-heading" ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-bold focus:outline-none">
            {HEADINGS[step]}
          </h2>
          <div role="status" className="empty:hidden">
            {notice && <p className="mb-4 rounded-md border border-line bg-[#fff8e5] p-3 text-sm">{notice}</p>}
          </div>
          {step === "address" && <AddressStep onDone={() => go(nextStep(step))} />}
          {step === "delivery" && <DeliveryStep now={now} onDone={() => go(nextStep(step))} />}
          {step === "payment" && <PaymentStep now={now} onDone={() => go(nextStep(step))} />}
          {step === "review" && <ReviewStep now={now} fixedNow={fixedNow} onPlaced={() => setPlacing(true)} />}
        </section>
        <OrderSummary className="lg:sticky lg:top-4" />
      </div>
    </div>
  );
}
