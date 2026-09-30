"use client";

import { useState } from "react";
import { TrashIcon } from "@/components/icons";
import { clampQuantity, parseQuantityInput, stepQuantity } from "@/lib/quantity";
import type { CartLineView } from "@/lib/cart/types";

const BUTTON =
  "flex size-[var(--tap)] items-center justify-center text-lg leading-none text-ink hover:bg-page-gray disabled:cursor-not-allowed disabled:text-[#b3b6b6] disabled:hover:bg-transparent sm:size-9";

/**
 * Quantity control for a cart line: minus (a trash can at quantity 1, which removes the line and offers Undo), an
 * editable number and plus. Typing is committed on blur or Enter; anything invalid restores the current value and
 * says why. Bounds come from lib/quantity and the store, not from this component.
 */
export function LineStepper({
  view,
  onQuantity,
  onRemove,
}: {
  view: CartLineView;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { quantity, maxQuantity, title } = view;

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = parseQuantityInput(raw);
    if (parsed === null || parsed < 1) {
      setError(`Enter a quantity from 1 to ${maxQuantity}.`);
      return;
    }
    setError(parsed > maxQuantity ? `Only ${maxQuantity} can be ordered.` : null);
    onQuantity(clampQuantity(parsed, maxQuantity));
  };

  return (
    <div className="inline-flex flex-col items-start">
      <div role="group" aria-label={`Quantity for ${title}`} className="inline-flex items-center rounded-lg border border-line bg-white">
        {quantity <= 1 ? (
          <button type="button" aria-label={`Remove ${title} from cart`} onClick={onRemove} className={`${BUTTON} rounded-l-lg`}>
            <TrashIcon className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Decrease quantity of ${title}`}
            onClick={() => {
              setError(null);
              onQuantity(stepQuantity(quantity, -1, maxQuantity));
            }}
            className={`${BUTTON} rounded-l-lg`}
          >
            <span aria-hidden="true">−</span>
          </button>
        )}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantity of ${title}`}
          value={draft ?? String(quantity)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => draft !== null && commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              setDraft(null);
              setError(null);
              onQuantity(stepQuantity(quantity, event.key === "ArrowUp" ? 1 : -1, maxQuantity));
            }
          }}
          className="h-[var(--tap)] w-11 border-x border-line text-center text-base text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-link sm:h-9"
        />
        <button
          type="button"
          aria-label={`Increase quantity of ${title}`}
          disabled={quantity >= maxQuantity}
          onClick={() => {
            setError(null);
            onQuantity(stepQuantity(quantity, 1, maxQuantity));
          }}
          className={`${BUTTON} rounded-r-lg`}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <p role="status" className="mt-1 text-xs text-price-sale empty:hidden">
        {error ?? (quantity >= maxQuantity ? (maxQuantity < 10 ? `Only ${maxQuantity} available` : "Limit 10 per order") : "")}
      </p>
    </div>
  );
}
