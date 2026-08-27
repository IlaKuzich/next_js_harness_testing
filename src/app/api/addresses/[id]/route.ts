import { type NextRequest, NextResponse } from "next/server";

import {
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "~/api/addresses/service";
import { getCurrentUser } from "~/lib/auth";

const MAX_LABEL_LENGTH = 40;

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
  const payload = (await request.json().catch(() => null)) as null | Record<
    string,
    unknown
  >;

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    if (payload.action === "set-default") {
      const address = await setDefaultAddress(id, user.id);
      return NextResponse.json({ address });
    }

    if (
      typeof payload.label === "string" &&
      payload.label.length > MAX_LABEL_LENGTH
    ) {
      return NextResponse.json(
        { error: `Label must be ${MAX_LABEL_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    const address = await updateAddress(id, user.id, {
      city: typeof payload.city === "string" ? payload.city : undefined,
      country:
        typeof payload.country === "string" ? payload.country : undefined,
      fullName:
        typeof payload.fullName === "string" ? payload.fullName : undefined,
      label: typeof payload.label === "string" ? payload.label : undefined,
      line1: typeof payload.line1 === "string" ? payload.line1 : undefined,
      line2: typeof payload.line2 === "string" ? payload.line2 : undefined,
      postalCode:
        typeof payload.postalCode === "string"
          ? payload.postalCode
          : undefined,
      state: typeof payload.state === "string" ? payload.state : undefined,
    });

    return NextResponse.json({ address });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update address";
    console.error("Error updating address:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

  try {
    await deleteAddress(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete address";
    console.error("Error deleting address:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
