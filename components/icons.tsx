// Small local icon set (inline SVG, decorative). Controls that use them supply their own accessible name.
interface IconProps {
  className?: string;
}

const svgProps = { viewBox: "0 0 24 24", "aria-hidden": true, focusable: "false" } as const;
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="M1.5 3h3.2l2.6 12.2a1 1 0 0 0 1 .8h9.4a1 1 0 0 0 1-.76L21 7.2H6" />
      <circle cx="9.6" cy="20" r="1.4" />
      <circle cx="17.4" cy="20" r="1.4" />
    </svg>
  );
}

export function PersonIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function LocationIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="M12 21s-7-6.2-7-11.2a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.7 3.8 5.7 3.8 9S14.6 18.3 12 21c-2.6-2.7-3.8-5.7-3.8-9S9.4 5.7 12 3Z" />
    </svg>
  );
}

export function CaretDownIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} className={className} fill="currentColor">
      <path d="M7 10h10l-5 6z" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5.5M14 11v5.5" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...svgProps} {...stroke} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.7 2.7L16.2 9.5" />
    </svg>
  );
}
