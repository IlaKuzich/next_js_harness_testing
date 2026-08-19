import { type NextRequest, NextResponse } from "next/server";

import type { ReturnStatus } from "~/db/schema/returns/types";

import { updateReturnStatus } from "~/api/returns/service";
import { getCurrentUser } from "~/lib/auth";

const ADMIN_SETTABLE_STATUSES: ReturnStatus[] = [
  "approved",
  "rejected",
  "refunded",
];

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
    adminNote?: string;
    status?: string;
  };

  if (
    !payload?.status ||
    !ADMIN_SETTABLE_STATUSES.includes(payload.status as ReturnStatus)
  ) {
    return NextResponse.json(
      {
        error: `status must be one of: ${ADMIN_SETTABLE_STATUSES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const returnRequest = await updateReturnStatus(
      id,
      payload.status as ReturnStatus,
      payload.adminNote,
    );
    return NextResponse.json({ return: returnRequest });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update return";
    console.error("Error updating return status:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
