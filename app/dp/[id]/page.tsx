import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/pdp/buy-box";
import { Breadcrumb } from "@/components/pdp/breadcrumb";
import { ProductGallery } from "@/components/pdp/gallery";
import { PriceBlock } from "@/components/pdp/price-block";
import { ProductProvider } from "@/components/pdp/product-provider";
import { ProductHeader } from "@/components/pdp/product-header";
import { AboutItem, ProductDetails } from "@/components/pdp/product-sections";
import { RelatedRail } from "@/components/pdp/related-rail";
import { VariantPicker } from "@/components/pdp/variant-picker";
import { getBreadcrumb, getProductById, getRelatedProducts } from "@/lib/catalog";
import { getVariant } from "@/lib/catalog/variants";
import { now } from "@/lib/clock";
import { estimateDelivery } from "@/lib/delivery";

interface ProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Product not found" };
  return { title: product.title, description: product.description.slice(0, 155) };
}

/**
 * Product detail page (FR-PDP-*). Server-rendered from the seed catalog; only the parts that depend on the
 * selected variant or quantity are client components, sharing one ProductProvider. An unknown id renders the
 * product-not-found page (app/dp/[id]/not-found.tsx) with a 404 status.
 */
export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const query = await searchParams;
  const requestedVariant = typeof query.variant === "string" ? query.variant : undefined;
  const initialVariant = getVariant(product, requestedVariant);
  const delivery = estimateDelivery(now(), product.shipping.businessDays, product.shipping.costCents);

  return (
    <>
      <Breadcrumb items={getBreadcrumb(product)} />
      <ProductProvider product={product} initialVariantId={initialVariant.id}>
        <div className="pdp-grid">
          <ProductHeader product={product} className="[grid-area:header]" />
          <ProductGallery className="[grid-area:gallery] xl:sticky xl:top-4 xl:self-start" />
          <PriceBlock className="[grid-area:pricing]" />
          <VariantPicker className="[grid-area:variants]" />
          <BuyBox delivery={delivery} className="[grid-area:buybox]" />
          <AboutItem product={product} className="[grid-area:about]" />
        </div>
      </ProductProvider>
      <ProductDetails product={product} />
      <RelatedRail products={getRelatedProducts(product)} />
    </>
  );
}
