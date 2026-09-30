import { describe, expect, it } from "vitest";
import { LOOKUP } from "@/lib/cart/fixtures";
import { orderTotals, taxCents } from "@/lib/pricing";
import { validateAddress } from "./address";
import { DELIVERY_OPTIONS, arrivalLabel, getDeliveryOption } from "./delivery";
import { TEST_CARD_APPROVED, TEST_CARD_DECLINED, formatCardNumber, maskedCard, passesLuhn, validateExpiry, validatePayment } from "./payment";
import { CHECKOUT_STORAGE_KEY, parseStoredCheckout, serializeCheckout } from "./persistence";
import { canEnterStep, firstIncompleteStep, initialCheckoutState, isStepComplete, missingStepMessage, nextStep, parseStep } from "./state";
import { createCheckoutStore } from "./store";
import type { AddressFields, CheckoutState } from "./types";

const NOW = new Date("2026-10-01T12:00:00Z"); // a Thursday
const good: AddressFields = { fullName: "Ada Lovelace", street: "12 Analytical Way", city: "Seattle", state: "WA", zip: "98101", phone: "206-555-0142" };
const card = { name: "Ada Lovelace", number: TEST_CARD_APPROVED, expiry: "12/34", cvc: "123" };

describe("validateAddress", () => {
  it("accepts a valid address and normalizes it", () => {
    const result = validateAddress({ ...good, fullName: "  Ada   Lovelace ", zip: " 98101-1234 ", phone: "1 (206) 555-0142" });
    expect(result).toEqual({ ok: true, address: { ...good, zip: "98101-1234", phone: "(206) 555-0142" } });
  });

  it("reports one message per invalid field", () => {
    const result = validateAddress({ fullName: "", street: "", city: "", state: "", zip: "", phone: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["city", "fullName", "phone", "state", "street", "zip"]);
  });

  it.each([
    ["zip", "9810", "zip"],
    ["zip", "98101-12", "zip"],
    ["zip", "ABCDE", "zip"],
    ["phone", "555-0142", "phone"],
    ["phone", "206-555-014x", "phone"],
    ["state", "ZZ", "state"],
    ["fullName", "A", "fullName"],
    ["street", "12", "street"],
  ] as const)("rejects a bad %s (%s)", (field, value, key) => {
    const result = validateAddress({ ...good, [field]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[key]).toBeTruthy();
  });

  it("accepts ZIP+4 and lower-case state codes", () => {
    expect(validateAddress({ ...good, zip: "98101-1234", state: "wa" }).ok).toBe(true);
  });
});

describe("delivery options", () => {
  it("has the three approved options with fixed prices", () => {
    expect(DELIVERY_OPTIONS.map((o) => [o.id, o.priceCents])).toEqual([["standard", 0], ["expedited", 999], ["one-day", 1999]]);
  });

  it("derives estimates from the injected clock (business days, UTC)", () => {
    expect(arrivalLabel(getDeliveryOption("standard"), NOW)).toBe("Thursday, October 8");
    expect(arrivalLabel(getDeliveryOption("expedited"), NOW)).toBe("Monday, October 5");
    expect(arrivalLabel(getDeliveryOption("one-day"), NOW)).toBe("Friday, October 2");
  });
});

describe("validatePayment (test mode)", () => {
  it("passes Luhn for the two test cards and rejects near misses", () => {
    expect(passesLuhn("4242424242424242")).toBe(true);
    expect(passesLuhn("4000000000000002")).toBe(true);
    expect(passesLuhn("4242424242424241")).toBe(false);
    expect(passesLuhn("42")).toBe(false);
  });

  it("accepts the approved test card and keeps only brand and last four", () => {
    const result = validatePayment(card, NOW);
    expect(result).toEqual({ ok: true, summary: { brand: "Visa", last4: "4242" } });
    expect(JSON.stringify(result)).not.toContain("4242424242424242");
    expect(JSON.stringify(result)).not.toContain("123");
    expect(maskedCard({ brand: "Visa", last4: "4242" })).toBe("Visa ending in 4242");
  });

  it("declines the decline test card", () => {
    expect(validatePayment({ ...card, number: TEST_CARD_DECLINED }, NOW)).toEqual({ ok: false, kind: "declined" });
  });

  it("accepts spaces and dashes in the number", () => {
    expect(validatePayment({ ...card, number: "4242-4242-4242-4242" }, NOW).ok).toBe(true);
  });

  it("rejects a Luhn-valid but unsupported card as an unsupported test card", () => {
    const result = validatePayment({ ...card, number: "5555 5555 5555 4444" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") expect(result.errors.number).toMatch(/test cards/);
  });

  it.each(["1234 5678 9012 3456", "4242 4242 4242 424", "abcd", "", "4242 4242 4242 4241"])("rejects malformed number %j", (number) => {
    const result = validatePayment({ ...card, number }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") expect(result.errors.number).toBeTruthy();
  });

  it("validates each other field", () => {
    const result = validatePayment({ name: "", number: TEST_CARD_APPROVED, expiry: "13/34", cvc: "12" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === "invalid") expect(Object.keys(result.errors).sort()).toEqual(["cvc", "expiry", "name"]);
  });

  it("reports field problems before declining", () => {
    const result = validatePayment({ ...card, number: TEST_CARD_DECLINED, cvc: "1" }, NOW);
    expect(result).toMatchObject({ ok: false, kind: "invalid" });
  });

  it("checks expiry against the clock: this month is fine, last month is expired", () => {
    expect(validateExpiry("10/26", NOW)).toBeNull();
    expect(validateExpiry("09/26", NOW)).toMatch(/expired/);
    expect(validateExpiry("1/26", NOW)).toMatch(/MM\/YY/);
    expect(validateExpiry("00/30", NOW)).toMatch(/month/);
  });

  it("formats the number as it is typed", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42a4")).toBe("424");
  });
});

describe("pricing: tax and totals", () => {
  it("rounds 8% half up in integer cents", () => {
    expect(taxCents(0)).toBe(0);
    expect(taxCents(1)).toBe(0);
    expect(taxCents(6)).toBe(0); // 0.48 -> 0
    expect(taxCents(7)).toBe(1); // 0.56 -> 1
    expect(taxCents(1250)).toBe(100); // exact
    expect(taxCents(1256)).toBe(100); // 100.48 -> 100
    expect(taxCents(1257)).toBe(101); // 100.56 -> 101
  });

  it("combines subtotal, delivery and tax", () => {
    expect(orderTotals(15998, 999)).toEqual({ subtotalCents: 15998, shippingCents: 999, taxCents: 1280, totalCents: 18277 });
    expect(orderTotals(0, 0)).toEqual({ subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 });
  });
});

describe("checkout state model", () => {
  const complete = (): CheckoutState => ({ ...initialCheckoutState("sub-12345678"), address: good, deliveryId: "standard", payment: { brand: "Visa", last4: "4242" } });

  it("starts with nothing complete, at the address step", () => {
    const state = initialCheckoutState("sub-12345678");
    expect(firstIncompleteStep(state)).toBe("address");
    expect(canEnterStep(state, "address")).toBe(true);
    expect(canEnterStep(state, "delivery")).toBe(false);
    expect(canEnterStep(state, "review")).toBe(false);
  });

  it("advances one completed step at a time", () => {
    let state = initialCheckoutState("sub-12345678");
    state = { ...state, address: good };
    expect(isStepComplete(state, "address")).toBe(true);
    expect(firstIncompleteStep(state)).toBe("delivery");
    expect(canEnterStep(state, "payment")).toBe(false);
    state = { ...state, deliveryId: "expedited" };
    expect(firstIncompleteStep(state)).toBe("payment");
    state = { ...state, payment: { brand: "Visa", last4: "4242" } };
    expect(firstIncompleteStep(state)).toBe("review");
    expect(canEnterStep(state, "review")).toBe(true);
  });

  it("lets a completed checkout open every step, so Back/Change works", () => {
    for (const step of ["address", "delivery", "payment", "review"] as const) expect(canEnterStep(complete(), step)).toBe(true);
  });

  it("re-locks later steps when an earlier one becomes invalid", () => {
    const state = { ...complete(), address: { ...good, zip: "1" } };
    expect(canEnterStep(state, "review")).toBe(false);
    expect(firstIncompleteStep(state)).toBe("address");
  });

  it("parses steps and explains what is missing", () => {
    expect(parseStep("payment")).toBe("payment");
    expect(parseStep("bogus")).toBeNull();
    expect(parseStep(null)).toBeNull();
    expect(nextStep("address")).toBe("delivery");
    expect(nextStep("review")).toBe("review");
    expect(missingStepMessage(initialCheckoutState("sub-12345678"), "review")).toMatch(/shipping address/);
  });

  it("the store applies each transition", () => {
    const store = createCheckoutStore(() => "sub-12345678");
    store.getState().setAddress(good);
    store.getState().setDelivery("one-day");
    store.getState().setPayment({ brand: "Visa", last4: "4242" });
    expect(store.getState().state).toMatchObject({ address: good, deliveryId: "one-day", payment: { last4: "4242" } });
    let n = 0;
    const store2 = createCheckoutStore(() => `sub-0000000${++n}`);
    store2.getState().reset();
    expect(store2.getState().state.submissionId).toBe("sub-00000002");
  });
});

describe("checkout persistence", () => {
  const ids = () => "sub-newnewnew";

  it("round-trips a state and never contains card data", () => {
    const state: CheckoutState = { address: good, deliveryId: "expedited", payment: { brand: "Visa", last4: "4242" }, submissionId: "sub-12345678" };
    const raw = serializeCheckout(state);
    expect(parseStoredCheckout(raw, ids)).toEqual({ state, recovered: false });
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["address", "deliveryId", "payment", "submissionId", "version"]);
    expect(CHECKOUT_STORAGE_KEY).toBe("checkout:v1");
  });

  it("starts fresh with nothing stored", () => {
    expect(parseStoredCheckout(null, ids)).toMatchObject({ recovered: false, state: { deliveryId: null, payment: null, submissionId: "sub-newnewnew" } });
  });

  it.each([["not json"], ["null"], ["[]"], ['{"version":9}'], ['"x"']])("recovers from %s", (raw) => {
    expect(parseStoredCheckout(raw, ids)).toMatchObject({ recovered: true, state: { deliveryId: null, payment: null } });
  });

  it("keeps good fields and drops bad ones individually", () => {
    const raw = JSON.stringify({ version: 1, address: { fullName: 5, street: "12 Analytical Way" }, deliveryId: "teleport", payment: { brand: "Visa", last4: "42" }, submissionId: "x" });
    const { state } = parseStoredCheckout(raw, ids);
    expect(state.address.fullName).toBe("");
    expect(state.address.street).toBe("12 Analytical Way");
    expect(state.deliveryId).toBeNull();
    expect(state.payment).toBeNull();
    expect(state.submissionId).toBe("sub-newnewnew");
  });

  it("uses the lookup fixture only for orders (sanity)", () => {
    expect(Object.keys(LOOKUP)).toContain("mug");
  });
});
