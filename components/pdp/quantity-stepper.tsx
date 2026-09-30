"use client";

import { useId, useState } from "react";
import { MAX_QUANTITY, MIN_QUANTITY, clampQuantity, parseQuantityInput, stepQuantity } from "@/lib/quantity";

interface QuantityStepperProps {
  value: number;
  /** Largest orderable quantity for the selected variant (stock-limited, at most 10). */
  max: number;
  onChange: (quantity: number) => void;
}

const BUTTON =
  "flex size-11 items-center justify-center text-xl leading-none text-ink hover:bg-page-gray disabled:cursor-not-allowed disabled:text-[#b3b6b6] disabled:hover:bg-transparent";

/**
 * Quantity control (FR-PDP-7): minus and plus buttons around an editable number. Arrow Up/Down step the value, typing
 * is committed on blur or Enter and clamped, and each button disables at its boundary. Bounds come from lib/quantity.
 */
export function QuantityStepper({ value, max, onChange }: QuantityStepperProps) {
  const labelId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = parseQuantityInput(raw);
    onChange(parsed === null ? value : clampQuantity(parsed, max));
    setDraft(null);
  };

  const limitNote = value >= max ? (max < MAX_QUANTITY ? `Only ${max} available` : `Limit ${MAX_QUANTITY} per order`) : "";

  return (
    <div role="group" aria-labelledby={labelId} className="mt-3">
      <span id={labelId} className="text-sm">
        Quantity:
      </span>
      <div className="mt-1 flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-line bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={value <= MIN_QUANTITY}
            onClick={() => onChange(stepQuantity(value, -1, max))}
            className={`${BUTTON} rounded-l-lg`}
          >
            <span aria-hidden="true">−</span>
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Quantity"
            value={draft ?? String(value)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(stepQuantity(value, event.key === "ArrowUp" ? 1 : -1, max));
                setDraft(null);
              } else if (event.key === "Enter") {
                event.preventDefault();
                commit(event.currentTarget.value);
              }
            }}
            className="h-11 w-12 border-x border-line text-center text-base text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-link"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={value >= max}
            onClick={() => onChange(stepQuantity(value, 1, max))}
            className={`${BUTTON} rounded-r-lg`}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <span role="status" className="text-xs text-muted">
          {limitNote}
        </span>
      </div>
    </div>
  );
}
