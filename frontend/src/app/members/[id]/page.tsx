"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { Member, BookingTimeline, Payment } from "@/lib/api/types";
import { getMember } from "@/lib/api/members";
import { request } from "@/lib/api/http";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(amount: number | string = 0) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount));
}

function fmtDatetime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch { return iso; }
}

function toManilaDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function dateGroupLabel(key: string) {
  const today = toManilaDateKey(new Date().toISOString());
  const tomorrow = toManilaDateKey(new Date(Date.now() + 86_400_000).toISOString());
  const d = new Date(`${key}T00:00:00+08:00`);
  const full = d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (key === today) return { short: "Today", full };
  if (key === tomorrow) return { short: "Tomorrow", full };
  return { short: full, full };
}

const BOOKING_STATUS_ROW: Record<string, string> = {
  confirmed: "bg-emerald-50/55",
  waitlist: "bg-amber-50/55",
  cancelled: "bg-rose-50/55",
};

const BOOKING_STATUS_ACCENT: Record<string, string> = {
  confirmed: "border-l-2 border-emerald-400",
  waitlist: "border-l-2 border-amber-400",
  cancelled: "border-l-2 border-rose-400",
};

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  waitlist: "bg-amber-100 text-amber-800",
  cancelled: "bg-rose-100 text-rose-800",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-800",
  partial: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-800",
  void: "bg-rose-100 text-rose-800",
};

const TIER_BADGE: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700",
  premium: "bg-amber-100 text-amber-800",
  pro: "bg-accent/10 text-accent",
};

// ─── component ───────────────────────────────────────────────────────────────

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = Number(params.id);

  const [member, setMember] = useState<Member | null>(null);
  const [bookings, setBookings] = useState<BookingTimeline[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState<"bookings" | "payments">("bookings");

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    Promise.all([
      getMember(memberId),
      request<BookingTimeline[]>(`/members/${memberId}/timeline/`),
      request<Payment[]>(`/members/${memberId}/payments/`),
    ])
      .then(([m, b, p]) => {
        setMember(m);
        setBookings(Array.isArray(b) ? b : (b as any).results ?? []);
        setPayments(Array.isArray(p) ? p : (p as any).results ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [memberId]);

  // Group bookings by Manila date
  const groupedBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const map: Record<string, BookingTimeline[]> = {};
    for (const b of sorted) {
      const key = toManilaDateKey(b.start_time);
      (map[key] ??= []).push(b);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, ...dateGroupLabel(key), items }));
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-2 text-sm text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>;
  if (!member) return <div className="py-12 text-center text-sm text-muted">Member not found</div>;

  const tierLabel = member.membership_tier
    ? member.membership_tier.charAt(0).toUpperCase() + member.membership_tier.slice(1)
    : "—";

  return (
    <div className="py-2 space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push("/members")}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          ← Back to Members
        </button>
        <PageHeader
          title={`${member.first_name} ${member.last_name}`}
          description={member.email}
        />
      </div>

      {/* Profile header card */}
      <section className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
            {member.first_name[0]}{member.last_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {member.first_name} {member.last_name}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[member.membership_tier ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                {tierLabel}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${member.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {member.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted">
              <span>{member.email}</span>
              {member.phone && <span>{member.phone}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Metric summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard title="Bookings" value={member.bookings_count ?? 0} icon="📅" />
        <MetricCard title="Attended" value={member.attended_count ?? 0} icon="✅" />
        <MetricCard title="No-shows" value={member.no_show_count ?? 0} icon="⚠️" />
        <MetricCard title="Total Fees" value={fmt(member.total_fees ?? 0)} icon="🧾" />
        <MetricCard title="Total Paid" value={fmt(member.total_paid ?? 0)} icon="💰" />
        <MetricCard title="Balance Due" value={fmt(member.total_balance_due ?? 0)} icon="⏳" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-line bg-white p-1 w-fit">
        {(["bookings", "payments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {tab} ({tab === "bookings" ? bookings.length : payments.length})
          </button>
        ))}
      </div>

      {/* ── Bookings tab ── */}
      {activeTab === "bookings" && (
        <div>
          {groupedBookings.length === 0 ? (
            <div className="rounded-xl border border-line bg-white py-12 text-center text-sm text-muted">
              No booking history yet.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedBookings.map((group) => (
                <section key={group.key} className="rounded-xl border border-line bg-white p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.short}</h3>
                      {group.short !== group.full && <p className="text-xs text-muted">{group.full}</p>}
                    </div>
                    <span className="rounded-full bg-card-hover px-2 py-1 text-xs font-medium text-foreground">
                      {group.items.length} booking{group.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((booking) => (
                      <div
                        key={booking.id}
                        className={`rounded border border-line px-3 py-2 text-sm ${BOOKING_STATUS_ROW[booking.status] ?? ""} ${BOOKING_STATUS_ACCENT[booking.status] ?? ""}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {fmtDatetime(booking.start_time)} – {new Date(booking.end_time).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${BOOKING_STATUS_BADGE[booking.status] ?? "bg-gray-100 text-gray-700"}`}>
                              {booking.status}
                            </span>
                            {booking.is_paid && (
                              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800">Paid</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                          <span>{(booking.court as any)?.name ?? `Court #${booking.court}`}</span>
                          <span>{booking.players_count} players</span>
                          <span>{fmt(booking.fee_amount)}</span>
                          {booking.attended && <span className="text-emerald-700">✓ Attended</span>}
                          {booking.no_show && <span className="text-rose-700">✗ No-show</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payments tab ── */}
      {activeTab === "payments" && (
        <div>
          {payments.length === 0 ? (
            <div className="rounded-xl border border-line bg-white py-12 text-center text-sm text-muted">
              No payment records yet.
            </div>
          ) : (
            <section className="rounded-xl border border-line bg-white p-3 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="pb-2 text-left text-xs font-semibold text-muted">Date</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted">Booking</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted">Method</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted">Reference</th>
                      <th className="pb-2 text-right text-xs font-semibold text-muted">Amount</th>
                      <th className="pb-2 text-left text-xs font-semibold text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-line last:border-0 hover:bg-card-hover transition-colors">
                        <td className="py-2 text-xs text-muted whitespace-nowrap">{fmtDatetime(p.payment_date)}</td>
                        <td className="py-2 text-foreground">#{p.booking}</td>
                        <td className="py-2 capitalize text-foreground">{p.method.replace("_", " ")}</td>
                        <td className="py-2 text-muted">{p.reference || "—"}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-foreground">{fmt(p.amount)}</td>
                        <td className="py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${PAYMENT_STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line">
                      <td colSpan={4} className="pt-2 text-xs font-semibold text-muted">Total paid</td>
                      <td className="pt-2 text-right tabular-nums font-bold text-foreground">
                        {fmt(payments.filter((p) => ["paid", "partial"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
