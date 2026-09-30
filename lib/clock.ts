/**
 * The current time, behind one seam. Set APP_FIXED_NOW (an ISO timestamp) to pin it, as the E2E run does, so
 * delivery estimates are deterministic. Unset in production, where it is the real time.
 */
export function now(): Date {
  const fixed = process.env.APP_FIXED_NOW;
  if (fixed) {
    const pinned = new Date(fixed);
    if (!Number.isNaN(pinned.getTime())) return pinned;
  }
  return new Date();
}
