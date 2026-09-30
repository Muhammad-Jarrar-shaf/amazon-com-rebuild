import type { AddressFields } from "./types";

export const US_STATES: readonly (readonly [code: string, name: string])[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

export const ADDRESS_FIELD_ORDER = ["fullName", "street", "city", "state", "zip", "phone"] as const;

export const EMPTY_ADDRESS: AddressFields = { fullName: "", street: "", city: "", state: "", zip: "", phone: "" };

export type AddressErrors = Partial<Record<keyof AddressFields, string>>;

export type AddressResult = { ok: true; address: AddressFields } | { ok: false; errors: AddressErrors };

const STATE_CODES = new Set(US_STATES.map(([code]) => code));
const ZIP = /^\d{5}(-\d{4})?$/;

/** Formats 10 digits as "(555) 123-4567". */
function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Deterministic local validation of a US address. Returns the normalized address (trimmed, phone formatted) or one
 * message per invalid field. Nothing is sent anywhere.
 */
export function validateAddress(input: AddressFields): AddressResult {
  const errors: AddressErrors = {};
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const street = input.street.trim().replace(/\s+/g, " ");
  const city = input.city.trim().replace(/\s+/g, " ");
  const state = input.state.trim().toUpperCase();
  const zip = input.zip.trim();
  let digits = input.phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);

  if (fullName.length < 2) errors.fullName = "Enter your full name.";
  else if (fullName.length > 80) errors.fullName = "Full name is too long (80 characters at most).";
  if (street.length < 4) errors.street = "Enter your street address.";
  else if (street.length > 120) errors.street = "Street address is too long (120 characters at most).";
  if (city.length < 2) errors.city = "Enter your city.";
  else if (city.length > 60) errors.city = "City is too long (60 characters at most).";
  if (!STATE_CODES.has(state)) errors.state = "Select your state.";
  if (!ZIP.test(zip)) errors.zip = "Enter a valid ZIP code: 5 digits, or 5+4 like 98101-1234.";
  if (digits.length !== 10) errors.phone = "Enter a 10-digit US phone number.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, address: { fullName, street, city, state, zip, phone: formatPhone(digits) } };
}

export const isAddressValid = (input: AddressFields): boolean => validateAddress(input).ok;
