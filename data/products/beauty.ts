import { illustration, photo } from "@/data/images";
import type { Product, Seller } from "@/lib/catalog/types";

const LUMEN: Seller = { soldBy: "Lumen Botanics", shipsFrom: "Rebuild Fulfillment", returns: "30-day refund / replacement" };
const DEWLIGHT: Seller = { soldBy: "Dewlight Skin", shipsFrom: "Rebuild Fulfillment", returns: "30-day refund / replacement" };

export const BEAUTY: Product[] = [
  {
    id: "B0LUMN0SRM",
    title: "Lumen Botanics 15% Vitamin C Serum with Hyaluronic Acid and Vitamin E, 1 fl oz",
    brand: "Lumen Botanics",
    byline: "Visit the Lumen Botanics Store",
    department: "beauty",
    category: "Facial Serums",
    description:
      "A lightweight daily serum that brightens and hydrates. Stabilised 15% vitamin C is paired with hyaluronic acid and vitamin E in a fragrance-free formula, packed in an airtight dropper bottle that protects the actives.",
    bullets: [
      "15% stabilised vitamin C brightens the look of dull skin.",
      "Hyaluronic acid plumps and hydrates; vitamin E supports the skin barrier.",
      "Fragrance-free and suitable for sensitive skin.",
      "Airtight, UV-protected amber-glass dropper bottle.",
    ],
    specs: [
      ["Brand", "Lumen Botanics"],
      ["Volume", "1 fl oz"],
      ["Key ingredients", "Vitamin C, hyaluronic acid, vitamin E"],
      ["Skin type", "All, including sensitive"],
      ["Fragrance", "Fragrance-free"],
    ],
    variantLabel: "Size",
    variants: [
      {
        id: "1-fl-oz",
        label: "1 fl oz",
        swatch: "#f0d9a8",
        priceCents: 2499,
        listPriceCents: 3499,
        images: [photo("serum", "Lumen Botanics vitamin C serum in a white dropper bottle on marble")],
        stock: 96,
      },
      {
        id: "2-fl-oz",
        label: "2 fl oz",
        swatch: "#e8c887",
        priceCents: 3999,
        listPriceCents: 5799,
        images: [photo("serum", "Lumen Botanics vitamin C serum in a white dropper bottle on marble")],
        stock: 52,
      },
    ],
    rating: 4.5,
    ratingCount: 27310,
    boughtPastMonth: 9000,
    badge: "best-seller",
    shipping: { costCents: 0, businessDays: 2 },
    seller: LUMEN,
    relatedIds: ["B0LUMN0MST", "B0DEWL0BRS", "B0BOOK0RIV", "B0KETL0STV"],
    tags: ["serum", "vitamin c", "skincare", "face", "hyaluronic acid", "beauty"],
    featuredRank: 8,
  },
  {
    id: "B0LUMN0MST",
    title: "Lumen Botanics Daily Moisturizer with SPF 30, Lightweight and Non-Greasy, 1.7 fl oz",
    brand: "Lumen Botanics",
    byline: "Visit the Lumen Botanics Store",
    department: "beauty",
    category: "Face Moisturizers",
    description:
      "Moisturizer and broad-spectrum SPF 30 in one step. The sheer, non-greasy lotion sinks in fast, leaves no white cast and sits well under makeup.",
    bullets: [
      "Broad-spectrum SPF 30 protection.",
      "Sheer, fast-absorbing, no white cast.",
      "Ceramides and niacinamide support the skin barrier.",
      "Fragrance-free and non-comedogenic.",
    ],
    specs: [
      ["Brand", "Lumen Botanics"],
      ["Volume", "1.7 fl oz"],
      ["SPF", "30"],
      ["Skin type", "All"],
    ],
    variantLabel: "Tint",
    variants: [
      { id: "sheer", label: "Sheer", swatch: "#f4e3d3", priceCents: 2199, listPriceCents: 2899, images: [illustration("Lumen Botanics SPF 30 moisturizer")], stock: 73 },
    ],
    rating: 3.9,
    ratingCount: 9825,
    boughtPastMonth: 2800,
    shipping: { costCents: 0, businessDays: 2 },
    seller: LUMEN,
    relatedIds: ["B0LUMN0SRM", "B0DEWL0BRS", "B0BOOK0SLT", "B0KETL0FRP"],
    tags: ["moisturizer", "spf", "sunscreen", "skincare", "face", "beauty"],
  },
  {
    id: "B0DEWL0BRS",
    title: "Dewlight Sonic Facial Cleansing Brush, Waterproof, USB-C Rechargeable",
    brand: "Dewlight",
    byline: "Visit the Dewlight Store",
    department: "beauty",
    category: "Skin Care Tools",
    description:
      "Sonic vibrations lift makeup and oil that a hand-wash leaves behind. The silicone head is gentle, hygienic and lasts for months on one charge.",
    bullets: [
      "Sonic silicone head cleans without harsh bristles.",
      "IPX7 waterproof, safe for the shower.",
      "Up to 100 uses per USB-C charge.",
      "Three intensity modes and a one-minute timer.",
    ],
    specs: [
      ["Brand", "Dewlight"],
      ["Material", "Medical-grade silicone"],
      ["Water resistance", "IPX7"],
      ["Charging", "USB-C"],
    ],
    variantLabel: "Color",
    variants: [
      { id: "blush", label: "Blush", swatch: "#f0b8c0", priceCents: 2999, listPriceCents: 4499, images: [illustration("Dewlight sonic cleansing brush in Blush")], stock: 25 },
      { id: "sage", label: "Sage", swatch: "#a6c4a2", priceCents: 2999, listPriceCents: 4499, images: [illustration("Dewlight sonic cleansing brush in Sage")], stock: 17 },
    ],
    rating: 3.6,
    ratingCount: 5407,
    boughtPastMonth: 800,
    shipping: { costCents: 0, businessDays: 3 },
    seller: DEWLIGHT,
    relatedIds: ["B0LUMN0SRM", "B0LUMN0MST", "B0NIMB0CBL", "B0BOOK0RIV"],
    tags: ["cleansing brush", "face", "skincare tool", "sonic", "beauty"],
  },
];
