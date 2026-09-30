import type { Product } from "@/lib/catalog/types";
import { BEAUTY } from "./beauty";
import { BOOKS } from "./books";
import { COMPUTERS } from "./computers";
import { ELECTRONICS } from "./electronics";
import { HOME_KITCHEN } from "./home-kitchen";
import { TOYS_GAMES } from "./toys-games";

/** The whole seed catalog: 30 products across 6 departments. Deterministic; no runtime data source. */
export const PRODUCTS: readonly Product[] = [...ELECTRONICS, ...COMPUTERS, ...HOME_KITCHEN, ...BOOKS, ...TOYS_GAMES, ...BEAUTY];
