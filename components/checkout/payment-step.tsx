"use client";

import { useRef, useState } from "react";
import { TextField } from "@/components/checkout/field";
import { DECLINED_MESSAGE, TEST_CARD_APPROVED, TEST_CARD_DECLINED, formatCardNumber, maskedCard, validatePayment, type CardErrors } from "@/lib/checkout/payment";
import { checkoutStore, useCheckout } from "@/lib/checkout/store";

const FIELD_ORDER = ["name", "number", "expiry", "cvc"] as const;

/** "1226" -> "12/26" as the shopper types. */
const formatExpiry = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/**
 * Step 3: TEST MODE payment. The card fields live only in this component's state: on success they are cleared and
 * only the brand and last four digits are kept (in the checkout state). Nothing is sent, logged or stored.
 */
export function PaymentStep({ now, onDone }: { now: Date; onDone: () => void }) {
  const saved = useCheckout((current) => current.state.payment);
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState<CardErrors>({});
  const [declined, setDeclined] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const empty = !card.name && !card.number && !card.expiry && !card.cvc;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saved && empty) {
      onDone(); // Keep the card already accepted for this checkout.
      return;
    }
    const result = validatePayment(card, now);
    if (result.ok) {
      checkoutStore.getState().setPayment(result.summary);
      setCard({ name: "", number: "", expiry: "", cvc: "" }); // the number and CVC are discarded here
      setErrors({});
      setDeclined(false);
      onDone();
      return;
    }
    checkoutStore.getState().setPayment(null);
    if (result.kind === "declined") {
      setErrors({});
      setDeclined(true);
      alertRef.current?.focus();
      return;
    }
    setDeclined(false);
    setErrors(result.errors);
    const first = FIELD_ORDER.find((name) => result.errors[name]);
    if (first) document.getElementById(`card-${first}`)?.focus();
  };

  const errorCount = Object.keys(errors).length;
  const set = (name: keyof typeof card, value: string) => {
    setDeclined(false);
    setCard((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Payment" data-shell="payment-form">
      <div data-shell="test-mode-banner" className="mb-4 rounded-md border border-thumb bg-[#fef8f0] p-3 text-sm">
        <p>
          <strong className="mr-2 rounded-sm bg-nav px-1.5 py-0.5 text-xs tracking-wide text-white">TEST MODE</strong>
          No real payment is taken and no card data leaves this page.
        </p>
        <p className="mt-2">
          Test-only card numbers: <code className="font-mono font-bold">{TEST_CARD_APPROVED}</code> is approved and <code className="font-mono font-bold">{TEST_CARD_DECLINED}</code> is declined. Any future
          expiry and any 3-digit code work.
        </p>
      </div>

      <div ref={alertRef} role="alert" tabIndex={-1} className="empty:hidden focus:outline-none">
        {declined && (
          <p data-shell="card-declined" className="mb-4 rounded-md border border-deal bg-[#fff5f5] p-3 text-sm text-deal">
            <strong>Your card was declined.</strong> {DECLINED_MESSAGE}
          </p>
        )}
        {errorCount > 0 && (
          <p className="mb-4 rounded-md border border-deal bg-[#fff5f5] p-3 text-sm text-deal">
            <strong>There {errorCount === 1 ? "is a problem" : "are problems"} with your card.</strong> Please fix the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`}.
          </p>
        )}
      </div>

      {saved && empty && (
        <p data-shell="payment-saved" className="mb-4 rounded-md bg-page-gray p-3 text-sm">
          <strong>{maskedCard(saved)}</strong> is set for this checkout (test card). Enter a different test card below to replace it, or continue.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="card-name" label="Name on card" value={card.name} error={errors.name} onChange={(value) => set("name", value)} autoComplete="cc-name" className="sm:col-span-2" />
        <TextField
          id="card-number"
          label="Card number"
          value={card.number}
          error={errors.number}
          onChange={(value) => set("number", formatCardNumber(value))}
          autoComplete="cc-number"
          inputMode="numeric"
          maxLength={23}
          placeholder="4242 4242 4242 4242"
          className="sm:col-span-2"
        />
        <TextField id="card-expiry" label="Expiration date" value={card.expiry} error={errors.expiry} onChange={(value) => set("expiry", formatExpiry(value))} autoComplete="cc-exp" inputMode="numeric" maxLength={5} placeholder="MM/YY" />
        <TextField id="card-cvc" label="Security code (CVC)" value={card.cvc} error={errors.cvc} onChange={(value) => set("cvc", value.replace(/\D/g, "").slice(0, 3))} autoComplete="cc-csc" inputMode="numeric" maxLength={3} placeholder="123" />
      </div>
      <button type="submit" className="mt-5 min-h-[var(--tap)] w-full rounded-full bg-cta px-8 py-2.5 text-sm text-ink hover:bg-cta-hover sm:w-auto">
        Review your order
      </button>
    </form>
  );
}
