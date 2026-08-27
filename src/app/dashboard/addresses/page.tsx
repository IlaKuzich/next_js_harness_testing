import { getCurrentUserOrRedirect } from "~/lib/auth";

import AddressesPageClient from "./page.client";

export default async function AddressesPage() {
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
          <h1 className="mb-6 text-3xl font-bold">Saved Addresses</h1>
          <AddressesPageClient />
        </div>
      </main>
    </div>
  );
}
