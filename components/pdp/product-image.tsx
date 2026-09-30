"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { FallbackIllustration } from "@/components/pdp/fallback-illustration";
import type { ImageRef } from "@/lib/catalog/types";
import type { DepartmentSlug } from "@/lib/departments";

interface ProductImageProps {
  image: ImageRef;
  department: DepartmentSlug;
  /** Tint for the generated illustration (the variant's swatch). */
  tone: string;
  sizes: string;
  /** Load eagerly at high priority (the main product image). */
  eager?: boolean;
  /** Hides the image from assistive tech when nearby text already names it (swatches, cards). */
  decorative?: boolean;
}

/**
 * Fills its (relatively positioned) parent. Renders the local photograph, or the generated illustration when the
 * product has no photo or the file fails to load, so a product page never shows a broken image (FR-ERR-3).
 * Server-rendered images can fail before React attaches `onError`, so the ref callback also catches an image that
 * has already finished loading with no pixels.
 */
export function ProductImage({ image, department, tone, sizes, eager = false, decorative = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  const checkAlreadyFailed = useCallback((element: HTMLImageElement | null) => {
    if (element && element.complete && element.naturalWidth === 0) setFailed(true);
  }, []);

  if (!image.src || failed) {
    return <FallbackIllustration department={department} tone={tone} label={image.alt} decorative={decorative} />;
  }
  return (
    <Image
      ref={checkAlreadyFailed}
      src={image.src}
      alt={decorative ? "" : image.alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => setFailed(true)}
      className="object-cover"
    />
  );
}
