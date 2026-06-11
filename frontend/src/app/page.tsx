"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { request } from "@/lib/api/http";

type PeriodOption = "7d" | "30d";
type HeatmapMode = "upcoming" | "past";

type TrendPoint = {
  date: string;
  count?: number;
  percentage?: number;
};

type HeatmapSlot = {
  hour: number;
  count: number;
  courts: string[];
};

type HeatmapDay = {
  date: string;
  weekday: string;
  slots: HeatmapSlot[];
};

interface BookingHeatmapResponse {
  period: string;
  mode: HeatmapMode;
  start_date: string;
  end_date: string;
  hours: number[];
  max_count: number;
  days: HeatmapDay[];
}

interface DashboardAlert {
  id: string;
  level: "info" | "warning";
  title: string;
  message: string;
  link: string;
}

interface OperationalAlertsResponse {
  generated_at: string;
  count: number;
  alerts: DashboardAlert[];
}

interface DashboardMetrics {
  total_bookings: number;
  court_utilization: number;
  active_members: number;
  pending_waitlist: number;
  revenue_mtd: number;
  outstanding_amount: number;
  average_booking_value: number;
  period: string;
  period_start: string;
  period_end: string;
  period_confirmed_bookings: number;
  bookings_delta_pct: number | null;
  utilization_avg_pct: number;
  utilization_delta_pct: number | null;
  trends: {
    bookings: TrendPoint[];
    utilization: TrendPoint[];
  };
}

function formatPHP(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatHour12(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const hour12 = normalizedHour % 12 || 12;
  return `${hour12}:00 ${suffix}`;
}

function formatHourRange12(hour: number): string {
  return `${formatHour12(hour)} - ${formatHour12(hour + 1)}`;
}

export default function Home() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [heatmap, setHeatmap] = useState<BookingHeatmapResponse | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [period, setPeriod] = useState<PeriodOption>("7d");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("upcoming");
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const heatClass = (count: number) => {
    if (!heatmap || heatmap.max_count === 0 || count === 0) {
      return "bg-card";
    }
    const ratio = count / heatmap.max_count;
    if (ratio < 0.25) return "bg-emerald-100";
    if (ratio < 0.5) return "bg-emerald-200";
    if (ratio < 0.75) return "bg-emerald-300";
    return "bg-emerald-500 text-white";
  };

  const fetchMetrics = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const [metricsData, heatmapData, alertsData] = await Promise.all([
          request<DashboardMetrics>("/dashboard/metrics/", {
            method: "GET",
            query: { period },
          }),
          request<BookingHeatmapResponse>("/dashboard/heatmap/", {
            method: "GET",
            query: { period, mode: heatmapMode },
          }),
          request<OperationalAlertsResponse>("/dashboard/alerts/", {
            method: "GET",
          }),
        ]);
        setMetrics(metricsData);
        setHeatmap(heatmapData);
        setAlerts(alertsData);
        setError(undefined);
        setLastUpdated(
          new Date().toLocaleTimeString("en-PH", {
            timeZone: "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [period, heatmapMode]
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchMetrics({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLive, fetchMetrics]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="mt-2 text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <PageHeader
        title="PickleBall Management System Dashboard"
        description="Real-time overview of your pickleball operations"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted">Range:</span>
        <button
          onClick={() => setPeriod("7d")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            period === "7d"
              ? "bg-accent text-white"
              : "border border-line bg-white text-foreground hover:bg-card-hover"
          }`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => setPeriod("30d")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            period === "30d"
              ? "bg-accent text-white"
              : "border border-line bg-white text-foreground hover:bg-card-hover"
          }`}
        >
          Last 30 days
        </button>
        {metrics && (
          <span className="text-xs text-muted">
            {metrics.period_start} to {metrics.period_end}
          </span>
        )}
        <span
          className={`ml-1 rounded-full px-2 py-1 text-xs font-medium ${
            isLive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {isLive ? "Live" : "Paused"}
        </span>
        {lastUpdated && (
          <span className="text-xs text-muted">Updated {lastUpdated}</span>
        )}
        <button
          onClick={() => setIsLive((prev) => !prev)}
          className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-foreground hover:bg-card-hover"
        >
          {isLive ? "Pause Live" : "Resume Live"}
        </button>
        <button
          onClick={() => fetchMetrics()}
          className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-foreground hover:bg-card-hover"
        >
          Refresh Now
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/bookings?scope=today" className="block">
          <MetricCard
            title="Today's Bookings"
            value={metrics?.total_bookings || 0}
            icon="📅"
            note={
              metrics?.total_bookings === 0
                ? "No bookings yet"
                : "bookings scheduled"
            }
          />
        </Link>
        <Link href="/courts?status=booked" className="block">
          <MetricCard
            title="Court Utilization"
            value={`${metrics?.court_utilization || 0}%`}
            icon="📊"
            note="of courts in use"
          />
        </Link>
        <Link href="/members?is_active=true" className="block">
          <MetricCard
            title="Active Members"
            value={metrics?.active_members || 0}
            icon="👥"
            note="members online"
          />
        </Link>
        <Link href="/bookings?status=waitlist" className="block">
          <MetricCard
            title="Waitlist"
            value={metrics?.pending_waitlist || 0}
            icon="⏳"
            note="pending bookings"
          />
        </Link>
        <Link href="/bookings?status=confirmed&scope=30d" className="block">
          <MetricCard
            title="Revenue (30d)"
            value={formatPHP(metrics?.revenue_mtd || 0)}
            icon="💰"
            note="paid confirmed bookings"
          />
        </Link>
      </div>

      <div className="mt-3 grid gap-4">
        <section className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">Outstanding</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">
            {formatPHP(metrics?.outstanding_amount || 0)}
          </p>
          <p className="mt-0.5 text-xs text-muted">unpaid confirmed bookings</p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Booking Heatmap</h2>
          <span className="text-xs text-muted">
            Peak intensity by day/hour ({period}, {heatmapMode})
          </span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-muted">View:</span>
          <button
            onClick={() => setHeatmapMode("upcoming")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              heatmapMode === "upcoming"
                ? "bg-accent text-white"
                : "border border-line bg-white text-foreground hover:bg-card-hover"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setHeatmapMode("past")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              heatmapMode === "past"
                ? "bg-accent text-white"
                : "border border-line bg-white text-foreground hover:bg-card-hover"
            }`}
          >
            Past
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-muted">Day</th>
                {(heatmap?.hours ?? []).map((hour) => (
                  <th key={hour} className="px-1 py-2 text-center text-muted font-medium">
                    {formatHour12(hour)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(heatmap?.days ?? []).map((day) => (
                <tr key={day.date} className="border-t border-line">
                  <td className="px-2 py-2 whitespace-nowrap text-foreground font-medium">
                    {day.weekday}
                  </td>
                  {day.slots.map((slot) => (
                    <td key={`${day.date}-${slot.hour}`} className="px-1 py-2 text-center">
                      <div
                        className={`rounded px-2 py-1 ${heatClass(slot.count)}`}
                        title={`${day.date} ${formatHourRange12(slot.hour)} - ${slot.count} bookings${
                          slot.courts.length > 0 ? ` | Courts: ${slot.courts.join(", ")}` : ""
                        }`}
                      >
                        <span className="font-semibold">{slot.count}</span>
                        {slot.courts.length > 0 && (
                          <p className="mt-1 truncate text-[10px] leading-tight">
                            {slot.courts.join(", ")}
                          </p>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Operational Alerts</h2>
            <span className="text-xs text-muted">{alerts?.count ?? 0} active</span>
          </div>

          {(alerts?.alerts ?? []).length === 0 ? (
            <p className="text-sm text-muted">No active alerts right now.</p>
          ) : (
            <div className="space-y-3">
              {(alerts?.alerts ?? []).map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.link}
                  className={`block rounded-lg border p-3 transition-colors ${
                    alert.level === "warning"
                      ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                      : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                  <p className="mt-1 text-xs text-muted">{alert.message}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/bookings"
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Create Booking
            </Link>
            <Link
              href="/members"
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Add Member
            </Link>
            <Link
              href="/courts"
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Manage Courts
            </Link>
            <Link
              href="/bookings?scope=today"
              className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Today's Bookings
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Getting Started
        </h2>
        <p className="text-sm text-muted mb-4">
          Navigate using the menu on the left to manage:
        </p>
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <strong>Courts</strong> - Add and manage your court inventory
          </li>
          <li>
            <strong>Members</strong> - Manage member profiles and memberships
          </li>
          <li>
            <strong>Bookings</strong> - View and manage all court bookings
          </li>
        </ul>
      </section>

      <footer className="mt-12 border-t border-line pt-6 pb-6 text-center">
        <p className="text-xs text-muted">
          Developed by The SoftWorks 2026 - (Abgao, Maasin City)
        </p>
      </footer>
    </div>
  );
}
