"use client";

import { useEffect, useState } from "react";
import { Modal, FormField, SelectInput, TextInput } from "./Form";
import { Booking, Payment } from "@/lib/api/types";
import { createPayment, updatePayment } from "@/lib/api/payments";
import { listBookings } from "@/lib/api/bookings";

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Payment;
  defaultBookingId?: number;
}

const DEFAULT_DATA: Partial<Payment> = {
  booking: undefined,
  method: "cash",
  reference: "",
  amount: 0,
  status: "unpaid",
  payment_date: new Date().toISOString().slice(0, 16),
};

export function PaymentFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultBookingId,
}: PaymentFormModalProps) {
  const [formData, setFormData] = useState<Partial<Payment>>(DEFAULT_DATA);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isOpen) return;

    listBookings({ page_size: 200 })
      .then((res) => setBookings(res.results))
      .catch(() => setError("Failed to load bookings"));

    if (initialData) {
      setFormData({
        ...initialData,
        payment_date: initialData.payment_date
          ? new Date(initialData.payment_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
    } else {
      setFormData({
        ...DEFAULT_DATA,
        booking: defaultBookingId,
      });
    }
  }, [isOpen, initialData, defaultBookingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    const nextValue = (() => {
      if (name === "booking") {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      if (name === "amount") {
        const parsed = Number.parseFloat(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      return value;
    })();

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.booking || !formData.method || !formData.status || !formData.amount || !formData.payment_date) {
      setError("Booking, method, amount, status, and payment date are required.");
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      if (initialData?.id) {
        await updatePayment(initialData.id, formData);
      } else {
        await createPayment({
          booking: formData.booking,
          method: formData.method,
          reference: formData.reference || "",
          amount: formData.amount,
          status: formData.status,
          payment_date: formData.payment_date,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Payment" : "Add New Payment"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <FormField label="Booking" required>
          <SelectInput
            name="booking"
            value={formData.booking || ""}
            onChange={handleChange}
            disabled={Boolean(defaultBookingId)}
            options={bookings.map((booking) => ({
              value: booking.id,
              label: `Booking #${booking.id} (${new Date(booking.start_time).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })})`,
            }))}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Method" required>
            <SelectInput
              name="method"
              value={formData.method || ""}
              onChange={handleChange}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "ewallet", label: "E-Wallet" },
                { value: "card", label: "Card" },
              ]}
              required
            />
          </FormField>

          <FormField label="Status" required>
            <SelectInput
              name="status"
              value={formData.status || ""}
              onChange={handleChange}
              options={[
                { value: "unpaid", label: "Unpaid" },
                { value: "partial", label: "Partial" },
                { value: "paid", label: "Paid" },
                { value: "refunded", label: "Refunded" },
                { value: "void", label: "Void" },
              ]}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount" required>
            <TextInput
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={typeof formData.amount === "number" ? formData.amount : ""}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Reference">
            <TextInput
              name="reference"
              value={formData.reference || ""}
              onChange={handleChange}
              placeholder="OR-1001 / TXN-ABC"
            />
          </FormField>
        </div>

        <FormField label="Payment Date" required>
          <TextInput
            name="payment_date"
            type="datetime-local"
            value={formData.payment_date || ""}
            onChange={handleChange}
            required
          />
        </FormField>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground hover:bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
