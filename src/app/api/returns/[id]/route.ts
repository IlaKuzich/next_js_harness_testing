import { type NextRequest, NextResponse } from "next/server";

import { cancelReturnAsOwner } from "~/api/returns/service";
import { getCurrentUser } from "~/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as null | {
    action?: string;
  };

  if (payload?.action !== "cancel") {
    return NextResponse.json(
      { error: 'Only the "cancel" action is supported' },
      { status: 400 },
    );
  }

  try {
    const returnRequest = await cancelReturnAsOwner(id, user.id);
    return NextResponse.json({ return: returnRequest });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel return";
    console.error("Error cancelling return:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
