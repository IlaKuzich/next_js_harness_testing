import type React from "react";

import Link from "next/link";

import { getCurrentUserOrRedirect } from "~/lib/auth";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  await getCurrentUserOrRedirect();

  // TODO: implement admin check
  // const user = await getCurrentUserOrRedirect();
  // if (!user?.isAdmin) {
  //   redirect("/");
  // }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      <nav className="mb-6 flex gap-4 border-b pb-4 text-sm font-medium">
        <Link className="hover:underline" href="/admin/summary">
          Summary
        </Link>
        <Link className="hover:underline" href="/admin/orders">
          Orders
        </Link>
      </nav>
      {children}
    </div>
  );
}
