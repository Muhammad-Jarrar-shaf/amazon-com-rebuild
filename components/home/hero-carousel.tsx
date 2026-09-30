"use client";

import { useRef, useState } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { ProductImage } from "@/components/pdp/product-image";
import { NavLink } from "@/components/ui/nav-link";
import type { HeroSlideView } from "@/lib/home/types";

/**
 * FR-HOME-1: the home hero. A native scroll-snap track (so touch swipes natively, with the next slide peeking on
 * mobile) plus Previous/Next buttons that wrap around. No autoplay. The current slide follows the scroll position,
 * so swiping, the buttons and tabbing into a slide's link all agree. Every slide is one link to a results page.
 */
export function HeroCarousel({ slides }: { slides: HeroSlideView[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  // The slide a button press is scrolling to. While a smooth scroll is under way the scroll position still reads as
  // an earlier slide; without this, a quick second press would start from that stale slide and be lost.
  const pending = useRef<number | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [current, setCurrent] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const count = slides.length;

  function slideElements(): HTMLElement[] {
    return [...(trackRef.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? [])];
  }

  /** The slide nearest the start of the track; the last one once the track cannot scroll further. */
  function indexFromScroll(): number {
    const track = trackRef.current;
    const elements = slideElements();
    if (!track || elements.length < 2) return 0;
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) return elements.length - 1;
    const step = elements[1]!.offsetLeft - elements[0]!.offsetLeft;
    return step > 0 ? Math.min(elements.length - 1, Math.max(0, Math.round(track.scrollLeft / step))) : 0;
  }

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const index = indexFromScroll();
      if (pending.current !== null && index !== pending.current) return; // still travelling to the pressed slide
      setCurrent(index);
    });
  }

  function settle() {
    pending.current = null;
    setCurrent(indexFromScroll());
  }

  function goTo(target: number) {
    const track = trackRef.current;
    const elements = slideElements();
    const index = (target + count) % count;
    const slide = slides[index];
    if (!track || elements.length < 2 || !slide) return;
    const step = elements[1]!.offsetLeft - elements[0]!.offsetLeft;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pending.current = index;
    // scrollend settles it; the timer covers browsers without scrollend and scrolls interrupted by a swipe.
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(settle, 1000);
    track.scrollTo({ left: index * step, behavior: reduceMotion ? "instant" : "smooth" });
    setCurrent(index);
    setAnnouncement(`Slide ${index + 1} of ${count}: ${slide.headline}`);
  }

  const button =
    "z-10 flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:bg-page-gray " +
    "md:absolute md:top-0 md:h-[var(--hero-body-h)] md:w-14 md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:hover:bg-white/40";

  return (
    <section aria-roledescription="carousel" aria-label="Featured" data-home="hero" className="relative">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onScrollEnd={() => {
          clearTimeout(pendingTimer.current);
          settle();
        }}
        data-home="hero-track"
        className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-4 [scrollbar-width:none] md:scroll-px-0 md:gap-0 md:px-0 md:pt-0 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            data-slide
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            className="relative w-[85%] shrink-0 snap-start md:w-full"
          >
            <NavLink
              href={slide.href}
              className="flex h-full min-h-40 items-center gap-4 overflow-hidden rounded-lg p-4 md:h-[var(--hero-h)] md:items-start md:rounded-none md:px-20 md:pt-8"
              style={{ backgroundImage: `linear-gradient(100deg, ${slide.background[0]}, ${slide.background[1]})` }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xl leading-tight font-bold sm:text-2xl md:text-4xl">{slide.headline}</span>
                <span className="mt-1 line-clamp-2 block text-sm md:mt-3 md:max-w-md md:text-base">{slide.body}</span>
                <span className="mt-3 inline-flex min-h-9 items-center rounded-full bg-cta px-4 text-sm font-medium md:mt-5 md:min-h-[var(--tap)] md:px-6">
                  {slide.cta}
                </span>
              </span>
              <span className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-white sm:size-36 md:size-52 lg:size-56">
                <ProductImage
                  image={slide.image}
                  department={slide.department}
                  tone={slide.tone}
                  sizes="(min-width: 1024px) 224px, (min-width: 768px) 208px, 144px"
                  eager={index === 0}
                  decorative
                />
              </span>
            </NavLink>
          </div>
        ))}
      </div>
      {/* Below 768 the buttons sit in a row under the slides; from 768 `contents` lifts them onto the hero's edges. */}
      <div className="mt-2 flex items-center justify-center gap-4 px-4 md:contents">
        <button type="button" onClick={() => goTo((pending.current ?? current) - 1)} aria-label="Previous slide" className={`${button} md:left-0`}>
          <ChevronRightIcon className="size-6 rotate-180 md:size-9" />
        </button>
        <p aria-hidden="true" data-home="hero-position" className="min-w-10 text-center text-sm text-muted tabular-nums md:hidden">
          {current + 1} / {count}
        </p>
        <button type="button" onClick={() => goTo((pending.current ?? current) + 1)} aria-label="Next slide" className={`${button} md:right-0`}>
          <ChevronRightIcon className="size-6 md:size-9" />
        </button>
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {/* From 1024 the category cards overlap the hero; this fades the slides into the page behind them. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-b from-transparent to-page-gray lg:block" />
    </section>
  );
}
