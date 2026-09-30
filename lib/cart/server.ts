import { getAllProducts } from "@/lib/catalog";
import { buildCartLookup } from "./lookup";
import type { CartLookup } from "./types";

// SERVER ONLY: this imports the catalog data. Client components receive the projection as a prop (CartProvider).

let cached: CartLookup | undefined;

export function getCartLookup(): CartLookup {
  cached ??= buildCartLookup(getAllProducts());
  return cached;
}
