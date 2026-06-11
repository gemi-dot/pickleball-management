"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/Navigation";
import { PaymentFormModal } from "@/components/PaymentForm";
import { Booking, Payment } from "@/lib/api/types";
import { deletePayment, listPayments } from "@/lib/api/payments";
import { listBookings } from "@/lib/api/bookings";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookingsById, setBookingsById] = useState<Record<number, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment>();
  const [error, setError] = useState<string>();

  const loadPayments = async () => {
    setLoading(true);
    try {
      const [paymentRes, bookingRes] = await Promise.all([
        listPayments({ page_size: 500 }),
        listBookings({ page_size: 500 }),
      ]);
      setPayments(paymentRes.results);
      setBookingsById(Object.fromEntries(bookingRes.results.map((booking) => [booking.id, booking])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleAdd = () => {
    setSelectedPayment(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsFormOpen(true);
  };

  const handleDelete = async (payment: Payment) => {
    if (!confirm("Delete this payment?")) return;

    try {
      await deletePayment(payment.id);
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment");
    }
  };

  const handleFormSuccess = () => {
    loadPayments();
  };

  const statusBadge = (status: string) => {
    const colors = {
      unpaid: "bg-amber-100 text-amber-800",
      partial: "bg-sky-100 text-sky-800",
      paid: "bg-emerald-100 text-emerald-800",
      refunded: "bg-slate-200 text-slate-800",
      void: "bg-rose-100 text-rose-800",
    };

    return (
      <span
        className={`inline-block rounded px-2 py-1 text-xs font-semibold capitalize ${
          colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status}
      </span>
    );
  };

  const mobileCardAccent = (status: string) => {
    const accents = {
      unpaid: "border-l-2 border-amber-400",
      partial: "border-l-2 border-sky-400",
      paid: "border-l-2 border-emerald-400",
      refunded: "border-l-2 border-slate-400",
      void: "border-l-2 border-rose-400",
    };

    return accents[status as keyof typeof accents] || "border-l-2 border-line";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDateTime = (dateTime: string) => {
    try {
      return new Date(dateTime).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTime;
    }
  };

  const columns = [
    {
      key: "booking" as const,
      label: "Booking",
      render: (bookingId: string | number) => {
        const id = Number(bookingId);
        const booking = bookingsById[id];
        if (!booking) return `#${id}`;
        return (
          <div className="min-w-0">
            <p className="font-medium text-foreground">#{id}</p>
            <p className="truncate text-xs text-muted">{formatDateTime(booking.start_time)}</p>
          </div>
        );
      },
    },
    {
      key: "method" as const,
      label: "Method",
      render: (method: string | number, row: Payment) => (
        <div className="min-w-0">
          <p className="capitalize">{String(method).replace("_", " ")}</p>
          <p className="truncate text-xs text-muted">{row.reference || "-"}</p>
        </div>
      ),
    },
    {
      key: "amount" as const,
      label: "Amount",
      render: (amount: string | number) => formatCurrency(Number(amount)),
    },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string | number) => statusBadge(String(status)),
    },
    {
      key: "paid_by_username" as const,
      label: "Paid By",
      render: (_value: string | number, row: Payment) => row.paid_by_username || "-",
    },
    {
      key: "payment_date" as const,
      label: "Payment Date",
      render: (value: string | number) => formatDateTime(String(value)),
    },
  ];

  return (
    <>
      <div className="py-2">
        <PageHeader
          title="Payments"
          description={`Manage ${payments.length} payment records`}
          action={{ label: "New Payment", onClick: handleAdd }}
        />

        {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-2 text-sm text-muted">Loading...</p>
            </div>
          </div>
        )}

        {!loading && payments.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted">No payments found</p>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <>
            <div className="space-y-3 md:hidden">
              {payments.map((payment) => {
                const booking = bookingsById[payment.booking];
                return (
                  <article
                    key={payment.id}
                    className={`rounded-lg border border-line bg-white px-2.5 py-2 ${mobileCardAccent(payment.status)}`}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Payment #{payment.id}</p>
                        <p className="truncate text-[11px] text-muted">
                          Booking #{payment.booking}
                          {booking ? ` | ${formatDateTime(booking.start_time)}` : ""}
                        </p>
                      </div>
                      {statusBadge(payment.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-tight">
                      <p><span className="text-muted">Amount:</span> <span className="font-medium text-foreground">{formatCurrency(Number(payment.amount))}</span></p>
                      <p><span className="text-muted">Method:</span> <span className="capitalize text-foreground">{payment.method.replace("_", " ")}</span></p>
                      <p><span className="text-muted">Paid By:</span> <span className="text-foreground">{payment.paid_by_username || "-"}</span></p>
                      <p><span className="text-muted">Date:</span> <span className="text-foreground">{formatDateTime(payment.payment_date)}</span></p>
                    </div>

                    {payment.reference && (
                      <p className="mt-1 text-[11px] text-muted">Reference: {payment.reference}</p>
                    )}

                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => handleEdit(payment)}
                        className="flex-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent/90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(payment)}
                        className="flex-1 rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <DataTable
                data={payments}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={false}
                actionColumnWidth="150px"
              />
            </div>
          </>
        )}
      </div>

      <PaymentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialData={selectedPayment}
      />
    </>
  );
}
