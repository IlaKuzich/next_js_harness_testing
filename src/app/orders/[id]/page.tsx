import { getCurrentUserOrRedirect } from "~/lib/auth";

import OrderDetailPageClient from "./page.client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getCurrentUserOrRedirect();
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div
          className={`
            container px-4
            md:px-6
          `}
        >
          <OrderDetailPageClient orderId={id} />
        </div>
      </main>
    </div>
  );
}
