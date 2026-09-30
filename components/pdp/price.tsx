import { formatMoney, splitMoney, type Cents } from "@/lib/pricing";

const SIZES = {
  lg: { symbol: "text-[13px]", whole: "text-[28px]", fraction: "text-[13px]" },
  md: { symbol: "text-[11px]", whole: "text-lg", fraction: "text-[11px]" },
  sm: { symbol: "text-[10px]", whole: "text-base", fraction: "text-[10px]" },
} as const;

/**
 * Large dollars with small superscript symbol and cents, as observed on amazon.com. Assistive tech reads the
 * plain formatted amount ("$79.99") instead of "79" and "99".
 */
export function Price({ cents, size = "lg", className = "" }: { cents: Cents; size?: keyof typeof SIZES; className?: string }) {
  const { symbol, whole, fraction } = splitMoney(cents);
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-start text-ink ${className}`}>
      <span className="sr-only">{formatMoney(cents)}</span>
      <span aria-hidden="true" className="inline-flex items-start leading-none">
        <span className={`${s.symbol} mt-[0.25em]`}>{symbol}</span>
        <span className={s.whole}>{whole}</span>
        <span className={`${s.fraction} mt-[0.25em]`}>{fraction}</span>
      </span>
    </span>
  );
}
