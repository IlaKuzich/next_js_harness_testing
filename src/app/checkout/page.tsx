import { getCurrentUserOrRedirect } from "~/lib/auth";

import CheckoutPageClient from "./page.client";

export default async function CheckoutPage() {
  await getCurrentUserOrRedirect();

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-10">
        <div
          className={`
            container px-4
            md:px-6
          `}
        >
          <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
          <CheckoutPageClient />
        </div>
      </main>
    </div>
  );
}
