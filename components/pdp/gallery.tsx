"use client";

import { useState } from "react";
import { ProductImage } from "@/components/pdp/product-image";
import { useProduct } from "@/components/pdp/product-provider";
import type { ImageRef } from "@/lib/catalog/types";
import type { DepartmentSlug } from "@/lib/departments";

interface GalleryViewProps {
  images: ImageRef[];
  department: DepartmentSlug;
  swatch: string;
  className: string;
}

function GalleryView({ images, department, swatch, className }: GalleryViewProps) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = images[index] ?? images[0];
  if (!current) return null;

  return (
    <section aria-label="Product images" className={`flex flex-col-reverse gap-3 md:flex-row md:gap-4 ${className}`}>
      {images.length > 1 && (
        <ul aria-label="Image thumbnails" className="flex gap-2 md:flex-col">
          {images.map((image, position) => {
            const selected = position === index;
            return (
              <li key={`${image.alt}-${position}`}>
                <button
                  type="button"
                  aria-label={`Show image ${position + 1} of ${images.length}`}
                  aria-pressed={selected}
                  onClick={() => setIndex(position)}
                  className={`relative block size-12 overflow-hidden rounded-md border-2 bg-page-gray ${selected ? "border-thumb shadow-[0_0_3px_2px_rgb(231_118_0/0.5)]" : "border-line hover:border-[#888]"}`}
                >
                  <ProductImage image={image} department={department} tone={swatch} sizes="48px" decorative />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="min-w-0 flex-1">
        <div
          className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-page-gray"
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const box = event.currentTarget.getBoundingClientRect();
            setZoom({ x: ((event.clientX - box.left) / box.width) * 100, y: ((event.clientY - box.top) / box.height) * 100 });
          }}
          onPointerLeave={() => setZoom(null)}
        >
          <div
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          >
            <ProductImage image={current} department={department} tone={swatch} sizes="(min-width: 1280px) 520px, (min-width: 768px) 45vw, 100vw" eager />
          </div>
        </div>
        <p className="mt-2 hidden text-center text-xs text-muted md:block">Roll over image to zoom in</p>
      </div>
    </section>
  );
}

/** Thumbnails plus a large main image for the selected variant. Changing variant swaps the whole gallery. */
export function ProductGallery({ className = "" }: { className?: string }) {
  const { product, variant } = useProduct();
  return <GalleryView key={variant.id} images={variant.images} department={product.department} swatch={variant.swatch} className={className} />;
}
