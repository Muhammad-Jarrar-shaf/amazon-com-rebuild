const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Review counts: 842, 2,314, 12.4K. */
export function formatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  const whole = Math.floor(count);
  if (whole < 10_000) return grouped.format(whole);
  const tenths = Math.floor(whole / 100) / 10;
  return `${Number.isInteger(tenths) ? tenths.toFixed(0) : tenths.toFixed(1)}K`;
}

/** Purchase-count bucket for social proof: "50+", "900+", "2K+". Below 50 purchases nothing is shown. */
export function boughtBucket(count: number | undefined): string | null {
  if (count === undefined || !Number.isFinite(count) || count < 50) return null;
  const whole = Math.floor(count);
  if (whole >= 1000) return `${Math.floor(whole / 1000)}K+`;
  if (whole >= 100) return `${Math.floor(whole / 100) * 100}+`;
  return "50+";
}

/** Social proof line: "2K+ bought in past month". */
export function formatBoughtPastMonth(count: number | undefined): string | null {
  const bucket = boughtBucket(count);
  return bucket === null ? null : `${bucket} bought in past month`;
}
