import type { ReactNode } from "react";
import { mixHex } from "@/lib/color";
import type { DepartmentSlug } from "@/lib/departments";

// Generated illustration for products without a photograph and the fallback for any image that fails to load
// (docs/decisions/0004-asset-strategy.md, FR-ERR-3). One line-art glyph per department on a gradient tinted with
// the variant's swatch color; the gradient stays dark enough for the white glyph at any tint.

const GLYPHS: Record<DepartmentSlug, ReactNode> = {
  electronics: (
    <>
      <path d="M30 150v-30a90 90 0 0 1 180 0v30" />
      <rect x="18" y="140" width="42" height="72" rx="14" />
      <rect x="180" y="140" width="42" height="72" rx="14" />
    </>
  ),
  computers: (
    <>
      <rect x="40" y="46" width="160" height="112" rx="10" />
      <path d="M14 186h212" />
    </>
  ),
  "home-kitchen": (
    <>
      <path d="M62 96h116l14 104H48z" />
      <path d="M86 96c0-24 68-24 68 0" />
      <path d="M180 112c40-6 44 44 8 56" />
      <path d="M62 112 32 90" />
    </>
  ),
  books: (
    <>
      <path d="M120 64c-30-18-70-20-95-10v150c25-10 65-8 95 10 30-18 70-20 95-10V54c-25-10-65-8-95 10z" />
      <path d="M120 64v150" />
    </>
  ),
  "toys-games": (
    <>
      <rect x="28" y="132" width="72" height="72" rx="8" />
      <rect x="110" y="132" width="72" height="72" rx="8" />
      <rect x="68" y="52" width="72" height="72" rx="8" />
    </>
  ),
  beauty: (
    <>
      <rect x="78" y="116" width="84" height="100" rx="18" />
      <path d="M100 116V84h40v32" />
      <path d="M120 84V46" />
      <ellipse cx="120" cy="40" rx="16" ry="8" />
    </>
  ),
};

interface FallbackIllustrationProps {
  department: DepartmentSlug;
  /** #rrggbb tint (the variant's swatch). */
  tone: string;
  label: string;
  decorative?: boolean;
  className?: string;
}

export function FallbackIllustration({ department, tone, label, decorative = false, className = "" }: FallbackIllustrationProps) {
  const gradientId = `illustration-${department}-${tone.slice(1)}`;
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mixHex(tone, "#000000", 0.18)} />
          <stop offset="1" stopColor={mixHex(tone, "#000000", 0.55)} />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${gradientId})`} />
      <g
        transform="translate(80 84)"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.92"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[department]}
      </g>
    </svg>
  );
}
