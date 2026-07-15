import AdminOrdersPageClient from "./page.client";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Orders</h2>
      <AdminOrdersPageClient />
    </div>
  );
}
