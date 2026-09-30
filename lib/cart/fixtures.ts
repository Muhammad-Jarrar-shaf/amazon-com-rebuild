import type { CartLookup, CartVariant } from "./types";

// Test fixtures only (no app code imports this): a small lookup with the situations the cart must handle.

const image = { src: null, alt: "Product" };
const variant = (overrides: Partial<CartVariant> & Pick<CartVariant, "id">): CartVariant => ({
  label: overrides.id,
  swatch: "#333333",
  priceCents: 1000,
  stock: 50,
  image,
  ...overrides,
});

export const LOOKUP: CartLookup = {
  headphones: {
    id: "headphones",
    title: "Halo Wireless Headphones",
    variantLabel: "Color",
    department: "electronics",
    variants: [
      variant({ id: "black", label: "Black", priceCents: 7999, listPriceCents: 9999 }),
      variant({ id: "white", label: "White", priceCents: 8499 }),
      variant({ id: "red", label: "Red", priceCents: 8499, stock: 0 }),
      variant({ id: "blue", label: "Blue", priceCents: 8499, stock: 3 }),
      variant({ id: "green", label: "Green", priceCents: 8499, shippingRestricted: true }),
    ],
  },
  mug: {
    id: "mug",
    title: "Ceramic Mug",
    variantLabel: "Size",
    department: "home-kitchen",
    variants: [variant({ id: "one", priceCents: 1299 })],
  },
  cable: {
    id: "cable",
    title: "USB Cable",
    variantLabel: "Length",
    department: "electronics",
    variants: [variant({ id: "1m", priceCents: 999 })],
  },
};
