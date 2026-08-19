import { and, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { db } from "~/db";
import { addressesTable } from "~/db/schema";

const MAX_LABEL_LENGTH = 40;

/**
 * List a user's saved addresses, default address first, newest first
 * otherwise.
 */
export async function getAddressesForUser(userId: string) {
  return db.query.addressesTable.findMany({
    orderBy: [desc(addressesTable.isDefault), desc(addressesTable.createdAt)],
    where: eq(addressesTable.userId, userId),
  });
}

async function clearDefaultAddress(userId: string) {
  await db
    .update(addressesTable)
    .set({ isDefault: false })
    .where(
      and(
        eq(addressesTable.userId, userId),
        eq(addressesTable.isDefault, true),
      ),
    );
}

async function getOwnedAddress(addressId: string, userId: string) {
  const address = await db.query.addressesTable.findFirst({
    where: eq(addressesTable.id, addressId),
  });

  if (!address) {
    throw new Error("Address not found");
  }

  if (address.userId !== userId) {
    throw new Error("You can only manage your own addresses");
  }

  return address;
}

export interface CreateAddressInput {
  city: string;
  country: string;
  fullName: string;
  isDefault?: boolean;
  label: string;
  line1: string;
  line2?: string;
  postalCode: string;
  state: string;
  userId: string;
}

/**
 * Create a saved address. The first address a user creates automatically
 * becomes their default; later ones only become default when requested.
 */
export async function createAddress(input: CreateAddressInput) {
  const { userId, ...rest } = input;

  if (rest.label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Label must be ${MAX_LABEL_LENGTH} characters or fewer`);
  }

  const existing = await getAddressesForUser(userId);
  const isDefault = rest.isDefault ?? existing.length === 0;

  if (isDefault) {
    await clearDefaultAddress(userId);
  }

  const now = new Date();
  const id = uuidv4();

  await db.insert(addressesTable).values({
    ...rest,
    createdAt: now,
    id,
    isDefault,
    updatedAt: now,
    userId,
  });

  return db.query.addressesTable.findFirst({
    where: eq(addressesTable.id, id),
  });
}

export interface UpdateAddressInput {
  city?: string;
  country?: string;
  fullName?: string;
  label?: string;
  line1?: string;
  line2?: string;
  postalCode?: string;
  state?: string;
}

/**
 * Update address fields. Only the owner may update their own address.
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  input: UpdateAddressInput,
) {
  await getOwnedAddress(addressId, userId);

  if (input.label && input.label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Label must be ${MAX_LABEL_LENGTH} characters or fewer`);
  }

  await db
    .update(addressesTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(addressesTable.id, addressId));

  return db.query.addressesTable.findFirst({
    where: eq(addressesTable.id, addressId),
  });
}

/**
 * Mark an address as the user's default, clearing the previous default.
 */
export async function setDefaultAddress(addressId: string, userId: string) {
  await getOwnedAddress(addressId, userId);

  await clearDefaultAddress(userId);

  await db
    .update(addressesTable)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(addressesTable.id, addressId));

  return db.query.addressesTable.findFirst({
    where: eq(addressesTable.id, addressId),
  });
}

/**
 * Delete an address. If it was the default, promote the next most
 * recent remaining address (if any) so a default is always available.
 */
export async function deleteAddress(addressId: string, userId: string) {
  const address = await getOwnedAddress(addressId, userId);

  await db.delete(addressesTable).where(eq(addressesTable.id, addressId));

  if (!address.isDefault) return;

  const remaining = await getAddressesForUser(userId);
  const next = remaining[0];

  if (next) {
    await db
      .update(addressesTable)
      .set({ isDefault: true })
      .where(eq(addressesTable.id, next.id));
  }
}
