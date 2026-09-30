import type { PaymentSummary } from "./types";

// TEST MODE ONLY. There is no payment provider: the card fields are checked locally and only the brand and the last
// four digits ever leave the input component (NFR-SEC-3). Never log, persist or send `number` or `cvc`.

export const TEST_CARD_APPROVED = "4242 4242 4242 4242";
export const TEST_CARD_DECLINED = "4000 0000 0000 0002";

export interface CardInput {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
}

export type CardErrors = Partial<Record<keyof CardInput, string>>;

export type PaymentResult =
  | { ok: true; summary: PaymentSummary }
  | { ok: false; kind: "invalid"; errors: CardErrors }
  | { ok: false; kind: "declined" };

export const DECLINED_MESSAGE = "This is the test decline card, so no order was created. Use the approved test card to continue.";

const digitsOf = (raw: string): string => raw.replace(/[\s-]/g, "");

/** Luhn checksum over a digit string. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Groups digits in fours as the shopper types ("4242 4242 ..."). */
export function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function cardBrand(digits: string): string {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Card";
}

/** "MM/YY" must be a real month and this month or later (a card is good through the end of its month). */
export function validateExpiry(raw: string, now: Date): string | null {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(raw.trim());
  if (!match) return "Enter the expiration date as MM/YY.";
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Enter a valid month (01-12).";
  if (year * 12 + month < now.getUTCFullYear() * 12 + now.getUTCMonth() + 1) return "This card has expired.";
  return null;
}

/**
 * Validates the test payment form. Field problems come first (each with its own message); a well-formed form for the
 * decline card then yields a declined result, and any other well-formed card is rejected as an unsupported test card.
 */
export function validatePayment(input: CardInput, now: Date): PaymentResult {
  const errors: CardErrors = {};
  const number = digitsOf(input.number);

  if (input.name.trim().length < 2) errors.name = "Enter the name on the card.";
  if (!/^\d+$/.test(number) || !passesLuhn(number)) errors.number = "Enter a valid card number.";
  const expiryError = validateExpiry(input.expiry, now);
  if (expiryError) errors.expiry = expiryError;
  if (!/^\d{3}$/.test(input.cvc.trim())) errors.cvc = "Enter the 3-digit security code.";

  const approved = digitsOf(TEST_CARD_APPROVED);
  const declined = digitsOf(TEST_CARD_DECLINED);
  if (!errors.number && number !== approved && number !== declined) {
    errors.number = `Only the test cards are supported in test mode. Use ${TEST_CARD_APPROVED}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, kind: "invalid", errors };
  if (number === declined) return { ok: false, kind: "declined" };
  return { ok: true, summary: { brand: cardBrand(number), last4: number.slice(-4) } };
}

export const maskedCard = (payment: PaymentSummary): string => `${payment.brand} ending in ${payment.last4}`;
