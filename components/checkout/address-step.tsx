"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/checkout/field";
import { ADDRESS_FIELD_ORDER, US_STATES, validateAddress, type AddressErrors } from "@/lib/checkout/address";
import { checkoutStore, useCheckout } from "@/lib/checkout/store";
import type { AddressFields } from "@/lib/checkout/types";

const fieldId = (name: keyof AddressFields) => `address-${name}`;

/** Step 1: US shipping address. Typing is saved as you go (a reload keeps it); Continue validates and moves on. */
export function AddressStep({ onDone }: { onDone: () => void }) {
  const address = useCheckout((current) => current.state.address);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (name: keyof AddressFields, value: string) => {
    const next = { ...checkoutStore.getState().state.address, [name]: value };
    checkoutStore.getState().setAddress(next);
    // Once errors are showing, keep them in step with what is typed.
    if (submitted) {
      const result = validateAddress(next);
      setErrors(result.ok ? {} : result.errors);
    }
  };

  const validateField = (name: keyof AddressFields) => {
    const result = validateAddress(checkoutStore.getState().state.address);
    setErrors((current) => {
      const next = { ...current };
      const message = result.ok ? undefined : result.errors[name];
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const result = validateAddress(checkoutStore.getState().state.address);
    if (!result.ok) {
      setErrors(result.errors);
      const first = ADDRESS_FIELD_ORDER.find((name) => result.errors[name]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setErrors({});
    checkoutStore.getState().setAddress(result.address);
    onDone();
  };

  const errorCount = Object.keys(errors).length;
  const common = (name: keyof AddressFields) => ({
    id: fieldId(name),
    value: address[name],
    error: errors[name],
    onChange: (value: string) => update(name, value),
    onBlur: () => validateField(name),
  });

  return (
    <form onSubmit={submit} noValidate aria-label="Shipping address" data-shell="address-form">
      <div role="alert" className="empty:hidden">
        {errorCount > 0 && (
          <p className="mb-4 rounded-md border border-deal bg-[#fff5f5] p-3 text-sm text-deal">
            <strong>There {errorCount === 1 ? "is a problem" : "are problems"} with your address.</strong> Please fix the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`}.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField {...common("fullName")} label="Full name" autoComplete="name" className="sm:col-span-2" />
        <TextField {...common("street")} label="Street address" autoComplete="street-address" className="sm:col-span-2" />
        <TextField {...common("city")} label="City" autoComplete="address-level2" />
        <SelectField {...common("state")} label="State" autoComplete="address-level1" options={US_STATES} placeholder="Select a state" />
        <TextField {...common("zip")} label="ZIP code" autoComplete="postal-code" inputMode="numeric" maxLength={10} hint="5 digits, or ZIP+4" />
        <TextField {...common("phone")} label="Phone number" autoComplete="tel" inputMode="tel" maxLength={20} hint="10-digit US number" />
      </div>
      <p className="mt-3 text-xs text-muted">Your address stays in this browser. It is not sent anywhere.</p>
      <button type="submit" className="mt-5 min-h-[var(--tap)] w-full rounded-full bg-cta px-8 py-2.5 text-sm text-ink hover:bg-cta-hover sm:w-auto">
        Continue to delivery
      </button>
    </form>
  );
}
