import { NextResponse } from "next/server";

import { getAllReturns } from "~/api/returns/service";
import { getCurrentUser, isAdminUser } from "~/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const returns = await getAllReturns();
    return NextResponse.json({ returns });
  } catch (error) {
    console.error("Error fetching all returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 },
    );
  }
}
