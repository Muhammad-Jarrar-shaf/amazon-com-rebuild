/** Blends a #rrggbb color toward another by `amount` (0..1). Used to tint the generated product illustrations. */
export function mixHex(from: string, to: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) throw new RangeError(`expected #rrggbb, got ${hex}`);
    const value = parseInt(match[1] as string, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const t = Math.min(1, Math.max(0, amount));
  const a = parse(from);
  const b = parse(to);
  const channel = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `#${[channel(0), channel(1), channel(2)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
