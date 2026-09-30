/**
 * Called once an order is placed from a click. The rest of that pointer gesture (the second press of a double click)
 * must not activate whatever the page shows under the pointer next: the "Placing your order" screen is shorter than
 * the review, so footer links move up, and then the confirmation's own links appear. Until a fresh press starts
 * (`mousedown` with `detail` 1), clicks with `detail >= 2` are swallowed. Keyboard activation (`detail` 0) and any
 * deliberate click are unaffected. No timers, so it behaves the same however slow the navigation is.
 */
let release: (() => void) | null = null;

export function ignoreRestOfGesture(): void {
  if (typeof document === "undefined") return;
  release?.();
  const onMouseDown = (event: MouseEvent) => {
    if (event.detail <= 1) release?.();
  };
  const onClick = (event: MouseEvent) => {
    if (event.detail >= 2) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("click", onClick, true);
  release = () => {
    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("click", onClick, true);
    release = null;
  };
}
