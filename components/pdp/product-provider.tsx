"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Availability } from "@/lib/availability";
import type { Product, Variant } from "@/lib/catalog/types";
import { getVariant, getVariantAvailability } from "@/lib/catalog/variants";
import { MIN_QUANTITY, clampQuantity } from "@/lib/quantity";

interface ProductState {
  product: Product;
  variant: Variant;
  availability: Availability;
  quantity: number;
  selectVariant: (variantId: string) => void;
  setQuantity: (quantity: number) => void;
}

const ProductContext = createContext<ProductState | null>(null);

/**
 * Real application state for the product page: which variant is selected and how many to buy. The gallery, price,
 * options and buy box all read it, so changing a variant updates every one of them together. The variant is
 * mirrored into the URL (`?variant=`) without a navigation so the selection survives a reload or a shared link.
 */
export function ProductProvider({ product, initialVariantId, children }: { product: Product; initialVariantId: string; children: ReactNode }) {
  const [variantId, setVariantId] = useState(() => getVariant(product, initialVariantId).id);
  const [quantity, setQuantityState] = useState<number>(MIN_QUANTITY);

  const variant = getVariant(product, variantId);
  const availability = getVariantAvailability(variant);

  const selectVariant = useCallback(
    (nextId: string) => {
      const next = product.variants.find((candidate) => candidate.id === nextId);
      if (!next) return;
      setVariantId(next.id);
      setQuantityState((current) => clampQuantity(current, getVariantAvailability(next).maxQuantity));
      const url = new URL(window.location.href);
      url.searchParams.set("variant", next.id);
      window.history.replaceState(window.history.state, "", url);
    },
    [product],
  );

  const setQuantity = useCallback((next: number) => setQuantityState(clampQuantity(next, availability.maxQuantity)), [availability.maxQuantity]);

  const value = useMemo(
    () => ({ product, variant, availability, quantity, selectVariant, setQuantity }),
    [product, variant, availability, quantity, selectVariant, setQuantity],
  );
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct(): ProductState {
  const state = useContext(ProductContext);
  if (!state) throw new Error("useProduct must be used inside <ProductProvider>");
  return state;
}
