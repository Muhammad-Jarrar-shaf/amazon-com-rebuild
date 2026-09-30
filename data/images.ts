import type { ImageRef } from "@/lib/catalog/types";

/** A local licensed photograph from public/assets/products (credits: public/assets/CREDITS.md). */
export const photo = (file: string, alt: string): ImageRef => ({ src: `/assets/products/${file}.webp`, alt });

/** No photograph: the generated department illustration is rendered instead. */
export const illustration = (alt: string): ImageRef => ({ src: null, alt });
