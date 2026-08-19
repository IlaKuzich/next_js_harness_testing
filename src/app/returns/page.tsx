import { getCurrentUserOrRedirect } from "~/lib/auth";

import ReturnsPageClient from "./page.client";

export default async function ReturnsPage() {
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
          <h1 className="mb-6 text-3xl font-bold">Your Returns</h1>
          <ReturnsPageClient />
        </div>
      </main>
    </div>
  );
}
