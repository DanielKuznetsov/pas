// app/page.js
import { auth } from "@clerk/nextjs/server";
import supabase from "@/utils/supabase/client";
import NewOrderForm from "@/app/order-form/page";
import AllOrders from "@/components/all_orders";

// Optional: ensure this route is always rendered dynamically
export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();

  // Not signed in → render marketing immediately (no client flicker).
  if (!userId) {
    return (
      <div className="flex gap-4 p-4">
        <p>Marketing Page</p>
      </div>
    );
  }

  // Signed in → fetch role on the server.
  const { data: row, error } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching role:", error);
  }

  const role = row?.role ?? "owner"; // sensible default if row missing

  return (
    <div className="flex gap-4 p-4">
      {role === "admin" ? <NewOrderForm /> : <AllOrders />}
      {/* <DBButton /> */}
    </div>
  );
}
