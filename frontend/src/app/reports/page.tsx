"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { request } from "@/lib/api/http";
import type { RevenueReport, RevenuePeriod } from "@/lib/api/types";

const PERIOD_OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  ewallet: "E-Wallet",
  card: "Card",
};

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-800",
  partial: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-800",
  void: "bg-rose-100 text-rose-800",
};

const METHOD_COLORS = [
  "bg-accent",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
];

function formatPHP(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<RevenuePeriod>("30d");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    request<RevenueReport>(`/dashboard/revenue/?period=${period}`)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [period]);

  const maxDailyTotal = Math.max(...(report?.daily_trend.map((d) => d.total) ?? [1]), 1);
  const maxMethodTotal = Math.max(...(report?.by_method.map((m) => m.total) ?? [1]), 1);

  return (
    <div className="py-2">
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Revenue Reports" description="Payment totals by method, status and date" />
        <div className="flex shrink-0 gap-1 rounded-lg border border-line bg-white p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-2 text-sm text-muted">Loading report...</p>
          </div>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              title="Net Revenue"
              value={formatPHP(report.net_revenue)}
              note={`${report.period_start} – ${report.period_end}`}
              icon="💰"
            />
            <MetricCard
              title="Gross Revenue"
              value={formatPHP(report.total_revenue)}
              note="Paid + partial payments"
              icon="📈"
            />
            <MetricCard
              title="Total Refunded"
              value={formatPHP(report.total_refunded)}
              note="Refunded payments"
              icon="↩️"
            />
            <MetricCard
              title="Transactions"
              value={report.total_transactions}
              note="Completed payments"
              icon="🧾"
            />
          </div>

          {/* Two-column breakdown */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* By payment method */}
            <section className="rounded-xl border border-line bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue by Payment Method</h2>
              {report.by_method.length === 0 ? (
                <p className="text-sm text-muted">No data for this period.</p>
              ) : (
                <div className="space-y-3">
                  {report.by_method.map((row, idx) => (
                    <div key={row.method}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground capitalize">
                          {METHOD_LABELS[row.method] ?? row.method}
                        </span>
                        <span className="text-muted">
                          {formatPHP(row.total)} · {row.count} txn{row.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-card-hover">
                        <div
                          className={`h-2 rounded-full transition-all ${METHOD_COLORS[idx % METHOD_COLORS.length]}`}
                          style={{ width: `${Math.round((row.total / maxMethodTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* By payment status */}
            <section className="rounded-xl border border-line bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue by Payment Status</h2>
              {report.by_status.length === 0 ? (
                <p className="text-sm text-muted">No data for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="pb-2 text-left text-xs font-semibold text-muted">Status</th>
                        <th className="pb-2 text-right text-xs font-semibold text-muted">Transactions</th>
                        <th className="pb-2 text-right text-xs font-semibold text-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_status.map((row) => (
                        <tr key={row.status} className="border-b border-line last:border-0">
                          <td className="py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-700"}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums text-foreground">{row.count}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-foreground">
                            {formatPHP(row.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Daily trend chart */}
          <section className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Daily Revenue Trend</h2>
              <span className="text-xs text-muted">{PERIOD_OPTIONS.find((o) => o.value === period)?.label}</span>
            </div>

            {report.daily_trend.every((d) => d.total === 0) ? (
              <p className="py-4 text-center text-sm text-muted">No revenue recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-0 items-end gap-px" style={{ minHeight: 80 }}>
                  {report.daily_trend.map((day) => {
                    const heightPct = maxDailyTotal > 0 ? (day.total / maxDailyTotal) * 100 : 0;
                    return (
                      <div
                        key={day.date}
                        className="group relative flex flex-1 flex-col items-center justify-end"
                        style={{ minHeight: 80 }}
                      >
                        <div
                          className="w-full min-h-[2px] rounded-t bg-accent/80 transition-all group-hover:bg-accent"
                          style={{ height: `${Math.max(heightPct, day.total > 0 ? 3 : 0)}%` }}
                        />
                        {/* Tooltip */}
                        {day.total > 0 && (
                          <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-foreground px-1.5 py-1 text-[10px] text-white group-hover:block whitespace-nowrap z-10">
                            {formatDate(day.date)}<br />{formatPHP(day.total)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels — show only first, middle, last */}
                {report.daily_trend.length > 0 && (
                  <div className="mt-1 flex justify-between text-[10px] text-muted">
                    <span>{formatDate(report.daily_trend[0].date)}</span>
                    <span>{formatDate(report.daily_trend[Math.floor(report.daily_trend.length / 2)].date)}</span>
                    <span>{formatDate(report.daily_trend[report.daily_trend.length - 1].date)}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
