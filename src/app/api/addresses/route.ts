import { type NextRequest, NextResponse } from "next/server";

import { createAddress, getAddressesForUser } from "~/api/addresses/service";
import { getCurrentUser } from "~/lib/auth";

const MAX_LABEL_LENGTH = 40;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const addresses = await getAddressesForUser(user.id);
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as null | Partial<{
    city: string;
    country: string;
    fullName: string;
    isDefault: boolean;
    label: string;
    line1: string;
    line2: string;
    postalCode: string;
    state: string;
  }>;

  if (
    !payload ||
    typeof payload.label !== "string" ||
    typeof payload.fullName !== "string" ||
    typeof payload.line1 !== "string" ||
    typeof payload.city !== "string" ||
    typeof payload.state !== "string" ||
    typeof payload.postalCode !== "string" ||
    typeof payload.country !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    city,
    country,
    fullName,
    isDefault,
    label,
    line1,
    line2,
    postalCode,
    state,
  } = payload;

  if (
    !label.trim() ||
    !fullName.trim() ||
    !line1.trim() ||
    !city.trim() ||
    !state.trim() ||
    !postalCode.trim() ||
    !country.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "label, fullName, line1, city, state, postalCode, and country are required",
      },
      { status: 400 },
    );
  }

  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json(
      { error: `Label must be ${MAX_LABEL_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  try {
    const address = await createAddress({
      city,
      country,
      fullName,
      isDefault,
      label,
      line1,
      line2: line2?.trim() || undefined,
      postalCode,
      state,
      userId: user.id,
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create address";
    console.error("Error creating address:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
