import { formatCount } from "@/lib/format";

const STAR_PATH = "M12 2.5l2.94 6.06 6.56.9-4.78 4.62 1.2 6.52L12 17.4l-5.92 3.2 1.2-6.52L2.5 9.46l6.56-.9z";

function Stars({ size }: { size: string }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => (
        <svg key={index} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`${size} shrink-0`}>
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

interface StarRatingProps {
  rating: number;
  count: number;
  size?: "sm" | "md";
}

/** Rating number, partially filled stars (exact to the tenth) and the review count. */
export function StarRating({ rating, count, size = "md" }: StarRatingProps) {
  const star = size === "sm" ? "size-3.5" : "size-[18px]";
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-ink">{rating.toFixed(1)}</span>
      <span role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`} className="relative inline-flex text-line">
        <span aria-hidden="true" className="inline-flex">
          <Stars size={star} />
        </span>
        <span aria-hidden="true" className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-star" style={{ width: `${percent}%` }}>
          <Stars size={star} />
        </span>
      </span>
      <span className="text-link">({formatCount(count)})</span>
    </span>
  );
}
