"use client";

import { useState, useEffect } from "react";
import { Modal, FormField, TextInput, SelectInput } from "./Form";
import { Booking, Court, Member, Payment } from "@/lib/api/types";
import { createBooking, getBookingAvailability, updateBooking } from "@/lib/api/bookings";
import { listCourts } from "@/lib/api/courts";
import { listMembers } from "@/lib/api/members";
import { listPayments } from "@/lib/api/payments";
import { PaymentFormModal } from "./PaymentForm";
import type { BookingAvailabilityResponse, BookingAvailabilitySlot } from "@/lib/api/types";

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

function extractDateFromDateTimeLocal(dateTimeLocal?: string): string {
  if (!dateTimeLocal || !dateTimeLocal.includes("T")) {
    return toManilaDateTimeLocalValue(new Date()).split("T")[0];
  }
  return dateTimeLocal.split("T")[0];
}

function getHourFromDateTimeLocal(dateTimeLocal?: string): number {
  if (!dateTimeLocal || !dateTimeLocal.includes("T")) {
    return 0;
  }
  const timePart = dateTimeLocal.split("T")[1] ?? "00:00";
  const hour = Number.parseInt(timePart.split(":")[0] ?? "0", 10);
  return Number.isNaN(hour) ? 0 : hour;
}

function deriveDurationHours(startTime?: string, endTime?: string): number {
  const startHour = getHourFromDateTimeLocal(startTime);
  const endHour = getHourFromDateTimeLocal(endTime);
  const diff = endHour - startHour;

  if (diff >= 1 && diff <= 4) {
    return diff;
  }
  return 2;
}

function formatSlotRange(startTime: string, endTime: string): string {
  const startLabel = new Date(startTime).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endLabel = new Date(endTime).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${startLabel} - ${endLabel}`;
}

function formatDateTimeLocalLabel(value?: string): string {
  if (!value || !value.includes("T")) {
    return "Not set";
  }

  const [datePart, timePart] = value.split("T");
  const [hourRaw, minuteRaw] = (timePart ?? "00:00").split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minutePadded = String(minute).padStart(2, "0");
  return `${datePart} ${hour12}:${minutePadded} ${suffix}`;
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
  const [availabilityDate, setAvailabilityDate] = useState<string>(
    toManilaDateTimeLocalValue(new Date()).split("T")[0]
  );
  const [durationHours, setDurationHours] = useState<number>(2);
  const [availability, setAvailability] = useState<BookingAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>();
  const [showAdvancedEdit, setShowAdvancedEdit] = useState<boolean>(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
        const initialStart = initialData.start_time
          ? toDateTimeLocalValue(initialData.start_time)
          : undefined;
        const initialEnd = initialData.end_time
          ? toDateTimeLocalValue(initialData.end_time)
          : undefined;
        setAvailabilityDate(extractDateFromDateTimeLocal(initialStart));
        setDurationHours(deriveDurationHours(initialStart, initialEnd));
        setShowAdvancedEdit(false);
      } else {
        const defaults = buildDefaultBookingFormData();
        setFormData(defaults);
        setAvailabilityDate(extractDateFromDateTimeLocal(defaults.start_time));
        setDurationHours(deriveDurationHours(defaults.start_time, defaults.end_time));
        setShowAdvancedEdit(false);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen || !availabilityDate) {
      return;
    }

    let isActive = true;
    setAvailabilityLoading(true);
    setAvailabilityError(undefined);

    getBookingAvailability({
      date: availabilityDate,
      duration_hours: durationHours,
      players_count:
        typeof formData.players_count === "number" ? formData.players_count : undefined,
    })
      .then((data) => {
        if (!isActive) return;
        setAvailability(data);
      })
      .catch((err) => {
        if (!isActive) return;
        setAvailabilityError(err instanceof Error ? err.message : "Failed to load availability");
      })
      .finally(() => {
        if (!isActive) return;
        setAvailabilityLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, availabilityDate, durationHours, formData.players_count]);

  useEffect(() => {
    if (!isOpen || !initialData?.id) {
      setPayments([]);
      return;
    }

    setPaymentsLoading(true);
    listPayments({ booking: initialData.id, page_size: 100 })
      .then((res) => setPayments(res.results))
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [isOpen, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasRequiredCoreFields = Boolean(
      formData.member && formData.court && formData.start_time && formData.end_time
    );
    if (!hasRequiredCoreFields) {
      setError("Select a member and choose an available court/time, or open Advanced Edit to set them manually.");
      return;
    }

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

  const handleAvailabilityPick = (slot: BookingAvailabilitySlot, courtId: number) => {
    setFormData((prev) => ({
      ...prev,
      court: courtId,
      start_time: toDateTimeLocalValue(slot.start_time),
      end_time: toDateTimeLocalValue(slot.end_time),
    }));
  };

  const selectedCourt = courts.find((court) => court.id === formData.court);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

  const formatPaymentDate = (value?: string) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const isSelectedAvailability = (slot: BookingAvailabilitySlot, courtId: number) => {
    const selectedStart = formData.start_time;
    const selectedEnd = formData.end_time;
    const slotStart = toDateTimeLocalValue(slot.start_time);
    const slotEnd = toDateTimeLocalValue(slot.end_time);

    return (
      selectedStart === slotStart &&
      selectedEnd === slotEnd &&
      Number(formData.court) === Number(courtId)
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Booking" : "Add New Booking"}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-6">
          <section className="rounded-lg border border-line bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>

            <label className="mt-1 flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={Boolean(formData.is_paid)}
                onChange={(event) => handlePaidChange(event.target.checked)}
                className="rounded border-line"
              />
              Mark as paid now
            </label>

            <section className="mt-4 rounded-lg border border-line bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Advanced Edit</p>
                <button
                  type="button"
                  onClick={() => setShowAdvancedEdit((prev) => !prev)}
                  className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-foreground hover:bg-card-hover"
                >
                  {showAdvancedEdit ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Optional: manually adjust court and exact start/end times.
              </p>

              {!showAdvancedEdit && (
                <div className="mt-3 rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted">
                  <span className="font-medium text-foreground">
                    {selectedCourt ? selectedCourt.name : "No court selected"}
                  </span>
                  <span className="mx-2">|</span>
                  <span>
                    {formatDateTimeLocalLabel(formData.start_time)} to {formatDateTimeLocalLabel(formData.end_time)}
                  </span>
                </div>
              )}

              {showAdvancedEdit && (
                <div className="mt-3 space-y-3">
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </div>
              )}
            </section>

            {initialData?.id && (
              <section className="mt-4 rounded-lg border border-line bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Payment History</p>
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-foreground hover:bg-card-hover"
                  >
                    + Add Payment
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-3 gap-2 rounded border border-line bg-white px-2 py-1.5 text-[11px] text-muted">
                  <span>Fee: {formatMoney(Number(formData.fee_amount || 0))}</span>
                  <span>Paid: {formatMoney(Number(formData.total_paid_amount || 0))}</span>
                  <span>Balance: {formatMoney(Number(formData.balance_due || 0))}</span>
                </div>

                {paymentsLoading && <p className="text-xs text-muted">Loading payment history...</p>}

                {!paymentsLoading && payments.length === 0 && (
                  <p className="text-xs text-muted">No payment history for this booking yet.</p>
                )}

                {!paymentsLoading && payments.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {payments.map((payment) => (
                      <div key={payment.id} className="rounded border border-line bg-white px-2 py-1.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {formatMoney(Number(payment.amount))}
                          </span>
                          <span className="rounded-full bg-card-hover px-2 py-0.5 capitalize text-foreground">
                            {payment.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-muted">
                          <span>{payment.method.replace("_", " ")}</span>
                          <span>{formatPaymentDate(payment.payment_date)}</span>
                        </div>
                        {payment.reference && (
                          <p className="mt-0.5 text-muted">Ref: {payment.reference}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>

          <section className="rounded-lg border border-line bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Quick Pick Availability</p>
              {formData.start_time && formData.end_time && selectedCourt && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Selected: {formatSlotRange(formData.start_time, formData.end_time)} - {selectedCourt.name}
                </span>
              )}
            </div>
            <p className="mb-2 text-[11px] text-muted">
              Pick a date and duration, then click a court chip to autofill court and time.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField label="Date">
                <TextInput
                  type="date"
                  value={availabilityDate}
                  onChange={(event) => setAvailabilityDate(event.target.value)}
                />
              </FormField>
              <FormField label="Duration (hours)">
                <SelectInput
                  value={String(durationHours)}
                  onChange={(event) => setDurationHours(Number.parseInt(event.target.value, 10))}
                  options={[
                    { value: "1", label: "1 hour" },
                    { value: "2", label: "2 hours" },
                    { value: "3", label: "3 hours" },
                    { value: "4", label: "4 hours" },
                  ]}
                />
              </FormField>
            </div>

            {availabilityError && (
              <p className="mt-2 text-xs text-red-600">{availabilityError}</p>
            )}

            <div className="mt-2 max-h-[56vh] space-y-1.5 overflow-y-auto pr-1">
              {availabilityLoading && (
                <p className="text-xs text-muted">Loading available time slots...</p>
              )}

              {!availabilityLoading && (availability?.slots ?? []).length === 0 && (
                <p className="text-xs text-muted">No slots found for this date and duration.</p>
              )}

              {!availabilityLoading &&
                (availability?.slots ?? []).map((slot) => (
                  <div key={`${slot.start_time}-${slot.end_time}`} className="rounded border border-line bg-white px-2 py-1.5">
                    <p className="text-[11px] font-semibold text-foreground">
                      {formatSlotRange(slot.start_time, slot.end_time)}
                    </p>
                    {slot.available_courts.length === 0 ? (
                      <p className="mt-0.5 text-[10px] text-muted">No available courts</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {slot.available_courts.map((court) => {
                          const selected = isSelectedAvailability(slot, court.id);
                          return (
                            <button
                              key={`${slot.start_time}-${court.id}`}
                              type="button"
                              onClick={() => handleAvailabilityPick(slot, court.id)}
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-colors ${
                                selected
                                  ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                                  : "border-line bg-card text-foreground hover:bg-card-hover"
                              }`}
                            >
                              {court.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex gap-3 border-t border-line bg-card/95 px-6 py-4 backdrop-blur">
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

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={async () => {
          if (!initialData?.id) return;
          const [bookingPayments] = await Promise.all([
            listPayments({ booking: initialData.id, page_size: 100 }),
            onSuccess(),
          ]);
          setPayments(bookingPayments.results);
        }}
        defaultBookingId={initialData?.id}
      />
    </Modal>
  );
}
