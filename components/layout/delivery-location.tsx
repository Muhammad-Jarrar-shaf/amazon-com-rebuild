import { LocationIcon } from "@/components/icons";

// Static: geolocation and address selection are out of scope (docs/ux-spec.md), so this is a label, not a control.
const COUNTRY = "United States";

export function DeliveryLocation({ variant = "header", className = "" }: { variant?: "header" | "row"; className?: string }) {
  if (variant === "row") {
    return (
      <div data-shell="delivery-row" className={`flex min-h-[var(--tap)] items-center gap-2 bg-strip px-3 text-sm text-white ${className}`}>
        <LocationIcon className="size-5 shrink-0" />
        <span>
          Deliver to <span className="font-bold">{COUNTRY}</span>
        </span>
      </div>
    );
  }
  return (
    <div data-shell="delivery-header" className={`nav-item flex items-end gap-1 px-2 py-1 text-white ${className}`}>
      <LocationIcon className="mb-0.5 size-5 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-xs text-[#ccc]">Deliver to</span>
        <span className="text-sm font-bold whitespace-nowrap">{COUNTRY}</span>
      </span>
    </div>
  );
}
