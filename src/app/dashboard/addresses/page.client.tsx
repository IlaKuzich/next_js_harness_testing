"use client";

import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface AddressSummary {
  city: string;
  country: string;
  fullName: string;
  id: string;
  isDefault: boolean;
  label: string;
  line1: string;
  line2: null | string;
  postalCode: string;
  state: string;
}

interface AddressFormState {
  city: string;
  country: string;
  fullName: string;
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  state: string;
}

const EMPTY_FORM: AddressFormState = {
  city: "",
  country: "",
  fullName: "",
  label: "",
  line1: "",
  line2: "",
  postalCode: "",
  state: "",
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function AddressesPageClient() {
  const [addresses, setAddresses] = React.useState<AddressSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<null | string>(null);
  const [form, setForm] = React.useState<AddressFormState>(EMPTY_FORM);
  const [pendingActionId, setPendingActionId] = React.useState<null | string>(
    null,
  );

  const loadAddresses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/addresses");
      const data = (await response.json()) as {
        addresses?: AddressSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load addresses");
      }

      setAddresses(data.addresses ?? []);
    } catch (error) {
      console.error("Error loading addresses:", error);
      toast.error("Failed to load addresses");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (address: AddressSummary) => {
    setEditingId(address.id);
    setForm({
      city: address.city,
      country: address.country,
      fullName: address.fullName,
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? "",
      postalCode: address.postalCode,
      state: address.state,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        editingId ? `/api/addresses/${editingId}` : "/api/addresses",
        {
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
          method: editingId ? "PATCH" : "POST",
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save address");
      }

      toast.success(editingId ? "Address updated" : "Address saved");
      setDialogOpen(false);
      await loadAddresses();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save address";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingActionId(id);
    try {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete address");
      }

      toast.success("Address removed");
      await loadAddresses();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete address";
      toast.error(message);
    } finally {
      setPendingActionId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setPendingActionId(id);
    try {
      const response = await fetch(`/api/addresses/${id}`, {
        body: JSON.stringify({ action: "set-default" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to set default address");
      }

      toast.success("Default address updated");
      await loadAddresses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to set default address";
      toast.error(message);
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Save shipping addresses so checkout is faster next time.
        </p>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add address
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent
            className={`
              flex flex-col items-center gap-2 py-12 text-center
              text-muted-foreground
            `}
          >
            <MapPin className="h-8 w-8" />
            <p>You haven&apos;t saved any addresses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`
            grid gap-4
            md:grid-cols-2
          `}
        >
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {address.label}
                  {address.isDefault ? <Badge>Default</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {address.fullName}
                </p>
                <p>{address.line1}</p>
                {address.line2 ? <p>{address.line2}</p> : null}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {!address.isDefault && (
                  <Button
                    disabled={pendingActionId === address.id}
                    onClick={() => handleSetDefault(address.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Set as default
                  </Button>
                )}
                <Button
                  onClick={() => openEditDialog(address)}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  disabled={pendingActionId === address.id}
                  onClick={() => handleDelete(address.id)}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit address" : "Add address"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                onChange={(event) =>
                  setForm({ ...form, label: event.target.value })
                }
                placeholder="Home, Work, etc."
                required
                value={form.label}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                required
                value={form.fullName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input
                id="line1"
                onChange={(event) =>
                  setForm({ ...form, line1: event.target.value })
                }
                required
                value={form.line1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line2">Address line 2 (optional)</Label>
              <Input
                id="line2"
                onChange={(event) =>
                  setForm({ ...form, line2: event.target.value })
                }
                value={form.line2}
              />
            </div>
            <div
              className={`
                grid gap-4
                sm:grid-cols-2
              `}
            >
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                  required
                  value={form.city}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  onChange={(event) =>
                    setForm({ ...form, state: event.target.value })
                  }
                  required
                  value={form.state}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  onChange={(event) =>
                    setForm({ ...form, postalCode: event.target.value })
                  }
                  required
                  value={form.postalCode}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  onChange={(event) =>
                    setForm({ ...form, country: event.target.value })
                  }
                  required
                  value={form.country}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Save changes" : "Save address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
