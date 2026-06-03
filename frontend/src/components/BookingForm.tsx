"use client";

import { useState, useEffect } from "react";
import { Modal, FormField, TextInput, SelectInput } from "./Form";
import { Booking, Court, Member } from "@/lib/api/types";
import { createBooking, updateBooking } from "@/lib/api/bookings";
import { listCourts } from "@/lib/api/courts";
import { listMembers } from "@/lib/api/members";

function toManilaDateTimeLocalValue(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function toDateTimeLocalValue(dateTime: string): string {
  return toManilaDateTimeLocalValue(new Date(dateTime));
}

function buildDefaultBookingFormData(): Partial<Booking> {
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return {
    court: undefined,
    member: undefined,
    start_time: toManilaDateTimeLocalValue(now),
    end_time: toManilaDateTimeLocalValue(end),
    players_count: 2,
    fee_amount: 0,
    is_paid: false,
    paid_at: null,
    status: "confirmed",
  };
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Booking;
}

export function BookingFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: BookingFormModalProps) {
  const [formData, setFormData] = useState<Partial<Booking>>(buildDefaultBookingFormData());
  const [courts, setCourts] = useState<Court[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isOpen) {
      Promise.all([listCourts(), listMembers()])
        .then(([courtsData, membersData]) => {
          setCourts(courtsData.results);
          setMembers(membersData.results);
        })
        .catch((err) => setError("Failed to load data"));

      if (initialData) {
        setFormData({
          ...initialData,
          start_time: initialData.start_time
            ? toDateTimeLocalValue(initialData.start_time)
            : "",
          end_time: initialData.end_time
            ? toDateTimeLocalValue(initialData.end_time)
            : "",
        });
      } else {
        setFormData(buildDefaultBookingFormData());
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      if (initialData?.id) {
        // Remove readonly fields before updating
        const { id, created_at, updated_at, ...updateData } = formData;
        await updateBooking(initialData.id, updateData);
      } else {
        await createBooking(formData as Booking);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    const nextValue = (() => {
      if (name === "players_count" || name === "court" || name === "member") {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      if (name === "fee_amount") {
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

  const handlePaidChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_paid: checked,
      paid_at: checked
        ? toManilaDateTimeLocalValue(new Date())
        : null,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Booking" : "Add New Booking"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormField label="Court" required>
          <SelectInput
            name="court"
            value={formData.court || ""}
            onChange={handleChange}
            options={courts.map((c) => ({
              value: c.id || "",
              label: `${c.name} (${c.is_indoor ? "Indoor" : "Outdoor"})`,
            }))}
            required
          />
        </FormField>

        <FormField label="Member" required>
          <SelectInput
            name="member"
            value={formData.member || ""}
            onChange={handleChange}
            options={members.map((m) => ({
              value: m.id || "",
              label: `${m.first_name} ${m.last_name}`,
            }))}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Time" required>
            <TextInput
              name="start_time"
              type="datetime-local"
              value={formData.start_time || ""}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="End Time" required>
            <TextInput
              name="end_time"
              type="datetime-local"
              value={formData.end_time || ""}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>

        <FormField label="Players Count" required>
          <SelectInput
            name="players_count"
            value={
              typeof formData.players_count === "number" && Number.isFinite(formData.players_count)
                ? formData.players_count
                : "2"
            }
            onChange={handleChange}
            options={[
              { value: "2", label: "2 (Singles)" },
              { value: "4", label: "4 (Doubles)" },
            ]}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fee Amount (PHP)" required>
            <TextInput
              name="fee_amount"
              type="number"
              min="0"
              step="0.01"
              value={
                typeof formData.fee_amount === "number" && Number.isFinite(formData.fee_amount)
                  ? formData.fee_amount
                  : ""
              }
              onChange={handleChange}
              required
            />
          </FormField>

          <div className="flex items-end">
            <label className="mb-2 flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={Boolean(formData.is_paid)}
                onChange={(event) => handlePaidChange(event.target.checked)}
                className="rounded border-line"
              />
              Mark as paid now
            </label>
          </div>
        </div>

        <FormField label="Status" required>
          <SelectInput
            name="status"
            value={formData.status || ""}
            onChange={handleChange}
            options={[
              { value: "confirmed", label: "Confirmed" },
              { value: "waitlist", label: "Waitlist" },
              { value: "cancelled", label: "Cancelled" },
            ]}
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
            {loading ? "Saving..." : "Save Booking"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
