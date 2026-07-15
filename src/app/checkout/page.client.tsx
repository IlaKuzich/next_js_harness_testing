"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useCart } from "~/lib/hooks/use-cart";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface ShippingFormState {
  city: string;
  country: string;
  line1: string;
  line2: string;
  name: string;
  postalCode: string;
  state: string;
}

const EMPTY_SHIPPING_FORM: ShippingFormState = {
  city: "",
  country: "",
  line1: "",
  line2: "",
  name: "",
  postalCode: "",
  state: "",
};

const TAX_RATE = 0.08;
const FREE_SHIPPING_THRESHOLD = 100;
const STANDARD_SHIPPING_COST = 9.99;

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function CheckoutPageClient() {
  const router = useRouter();
  const { clearCart, items, subtotal } = useCart();

  const [shipping, setShipping] =
    React.useState<ShippingFormState>(EMPTY_SHIPPING_FORM);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);

  const shippingCost = React.useMemo(
    () =>
      subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : STANDARD_SHIPPING_COST,
    [subtotal],
  );
  const tax = React.useMemo(
    () => Math.round(subtotal * TAX_RATE * 100) / 100,
    [subtotal],
  );
  const total = React.useMemo(
    () => Math.round((subtotal + shippingCost + tax) * 100) / 100,
    [shippingCost, subtotal, tax],
  );

  const updateField = React.useCallback(
    (field: keyof ShippingFormState) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setShipping((prev) => ({ ...prev, [field]: event.target.value }));
      },
    [],
  );

  const handlePlaceOrder = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (items.length === 0) {
        toast.error("Your cart is empty");
        return;
      }

      setIsPlacingOrder(true);
      try {
        const response = await fetch("/api/orders", {
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.id,
              productImage: item.image,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
            })),
            shippingAddress: {
              city: shipping.city,
              country: shipping.country,
              line1: shipping.line1,
              line2: shipping.line2 || undefined,
              name: shipping.name,
              postalCode: shipping.postalCode,
              state: shipping.state,
            },
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await response.json()) as {
          error?: string;
          order?: { id: string };
        };

        if (!response.ok || !data.order) {
          throw new Error(data.error ?? "Failed to place order");
        }

        clearCart();
        toast.success("Order placed!");
        router.push(`/orders/${data.order.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to place order";
        toast.error(message);
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [clearCart, items, router, shipping],
  );

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        Your cart is empty. Add something before checking out.
      </p>
    );
  }

  return (
    <div
      className={`
        grid grid-cols-1 gap-8
        md:grid-cols-2
      `}
    >
      <form className="space-y-4" onSubmit={handlePlaceOrder}>
        <h2 className="text-xl font-semibold">Shipping address</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            onChange={updateField("name")}
            required
            value={shipping.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="line1">Address line 1</Label>
          <Input
            id="line1"
            onChange={updateField("line1")}
            required
            value={shipping.line1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="line2">Address line 2 (optional)</Label>
          <Input
            id="line2"
            onChange={updateField("line2")}
            value={shipping.line2}
          />
        </div>

        <div className={`grid grid-cols-2 gap-4`}>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              onChange={updateField("city")}
              required
              value={shipping.city}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              onChange={updateField("state")}
              required
              value={shipping.state}
            />
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-4`}>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              onChange={updateField("postalCode")}
              required
              value={shipping.postalCode}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              onChange={updateField("country")}
              required
              value={shipping.country}
            />
          </div>
        </div>

        <Button className="w-full" disabled={isPlacingOrder} type="submit">
          {isPlacingOrder ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing order…
            </>
          ) : (
            "Place order"
          )}
        </Button>
      </form>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Order summary</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div className="flex justify-between text-sm" key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                {CURRENCY_FORMATTER.format(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{CURRENCY_FORMATTER.format(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {shippingCost === 0
                ? "Free"
                : CURRENCY_FORMATTER.format(shippingCost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{CURRENCY_FORMATTER.format(tax)}</span>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{CURRENCY_FORMATTER.format(total)}</span>
        </div>
      </div>
    </div>
  );
}
