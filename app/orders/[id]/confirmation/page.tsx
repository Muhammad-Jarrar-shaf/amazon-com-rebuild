import type { Metadata } from "next";
import { Confirmation } from "@/components/orders/confirmation";

export const metadata: Metadata = { title: "Order confirmation" };

/** Order confirmation (FR-ORD-1). The order is read from the browser's saved orders by id. */
export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div data-page="confirmation">
      <Confirmation orderId={decodeURIComponent(id)} />
    </div>
  );
}
