"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { DataTable } from "@/components/DataTable";
import { BookingFormModal } from "@/components/BookingForm";
import { Booking, Court, Member } from "@/lib/api/types";
import { listBookings, deleteBooking } from "@/lib/api/bookings";
import { listCourts } from "@/lib/api/courts";
import { listMembers } from "@/lib/api/members";

export default function BookingsPage() {
	const searchParams = useSearchParams();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [courtsById, setCourtsById] = useState<Record<number, Court>>({});
	const [membersById, setMembersById] = useState<Record<number, Member>>({});
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<Booking>();
	const [error, setError] = useState<string>();
	const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
		start: "",
		end: "",
	});

	const handleDateRangeChange = (type: "start" | "end", value: string) => {
		setDateRange((prev) => ({
			...prev,
			[type]: value,
		}));
	};

	const loadBookings = async (status?: string, scope?: string) => {
		setLoading(true);
		try {
			const now = new Date();
			const query: {
				status?: string;
				start_time_after?: string;
				end_time_before?: string;
			} = {};

			if (status) {
				query.status = status;
			}

			if (scope === "today") {
				const start = new Date(now);
				start.setHours(0, 0, 0, 0);
				const end = new Date(now);
				end.setHours(23, 59, 59, 999);
				query.start_time_after = start.toISOString();
				query.end_time_before = end.toISOString();
			}

			if (scope === "30d") {
				const start = new Date(now);
				start.setDate(start.getDate() - 30);
				query.start_time_after = start.toISOString();
			}

			if (dateRange.start) {
				const start = new Date(dateRange.start);
				start.setHours(0, 0, 0, 0);
				query.start_time_after = start.toISOString();
			}

			if (dateRange.end) {
				const end = new Date(dateRange.end);
				end.setHours(23, 59, 59, 999);
				query.end_time_before = end.toISOString();
			}

			const response = await listBookings(query);
			setBookings(response.results);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load bookings");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		Promise.all([listCourts({ page_size: 200 }), listMembers({ page_size: 500 })])
			.then(([courtsRes, membersRes]) => {
				setCourtsById(
					Object.fromEntries(
						courtsRes.results.map((court) => [court.id, court])
					)
				);
				setMembersById(
					Object.fromEntries(
						membersRes.results.map((member) => [member.id, member])
					)
				);
			})
			.catch(() => {
				// Keep table usable with numeric IDs if lookup fetch fails.
			});
	}, []);

	useEffect(() => {
		const status = searchParams.get("status") || undefined;
		const scope = searchParams.get("scope") || undefined;
		loadBookings(status, scope);
	}, [searchParams]);

	useEffect(() => {
		if (dateRange.start || dateRange.end) {
			loadBookings();
		}
	}, [dateRange]);

	const handleAdd = () => {
		setSelectedBooking(undefined);
		setIsFormOpen(true);
	};

	const handleEdit = (booking: Booking) => {
		setSelectedBooking(booking);
		setIsFormOpen(true);
	};

	const handleDelete = async (booking: Booking) => {
		if (confirm("Delete this booking?")) {
			try {
				await deleteBooking(booking.id!);
				await loadBookings();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to delete booking");
			}
		}
	};

	const handleFormSuccess = () => {
		loadBookings();
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

	const formatSchedule = (startTime: string, endTime: string) => {
		try {
			const start = new Date(startTime);
			const end = new Date(endTime);
			const dateLabel = start.toLocaleDateString("en-PH", {
				timeZone: "Asia/Manila",
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "2-digit",
			});
			const startLabel = start.toLocaleTimeString("en-PH", {
				timeZone: "Asia/Manila",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
			const endLabel = end.toLocaleTimeString("en-PH", {
				timeZone: "Asia/Manila",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});

			return `${dateLabel} | ${startLabel} - ${endLabel}`;
		} catch {
			return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
		}
	};

	const toManilaDateKey = (dateTime: string) => {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Manila",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date(dateTime));
	};

	const formatDateHeading = (dateKey: string) => {
		const date = new Date(`${dateKey}T00:00:00+08:00`);
		return date.toLocaleDateString("en-PH", {
			timeZone: "Asia/Manila",
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatTimeRange = (startTime: string, endTime: string) => {
		try {
			const start = new Date(startTime).toLocaleTimeString("en-PH", {
				timeZone: "Asia/Manila",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
			const end = new Date(endTime).toLocaleTimeString("en-PH", {
				timeZone: "Asia/Manila",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
			return `${start} - ${end}`;
		} catch {
			return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
		}
	};

	const sortedBookings = useMemo(() => {
		return [...bookings].sort((a, b) => {
			const timeA = new Date(a.start_time).getTime();
			const timeB = new Date(b.start_time).getTime();
			return timeA - timeB;
		});
	}, [bookings]);

	const groupedBookings = useMemo(() => {
		const todayKey = toManilaDateKey(new Date().toISOString());
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowKey = toManilaDateKey(tomorrow.toISOString());

		const groups = sortedBookings.reduce((acc, booking) => {
			const key = toManilaDateKey(booking.start_time);
			if (!acc[key]) {
				let label = formatDateHeading(key);
				if (key === todayKey) {
					label = "Today";
				} else if (key === tomorrowKey) {
					label = "Tomorrow";
				}

				acc[key] = {
					dateKey: key,
					label,
					subtitle: formatDateHeading(key),
					items: [] as Booking[],
				};
			}

			acc[key].items.push(booking);
			return acc;
		}, {} as Record<string, { dateKey: string; label: string; subtitle: string; items: Booking[] }>);

		return Object.values(groups).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
	}, [sortedBookings]);

	const statusBadge = (status: string) => {
		const colors = {
			confirmed: "bg-green-100 text-green-800",
			waitlist: "bg-yellow-100 text-yellow-800",
			cancelled: "bg-red-100 text-red-800",
		};
		return (
			<span
				className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${
					colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
				}`}
			>
				{status}
			</span>
		);
	};

	const paymentProgressBadge = (status?: string) => {
		const colors = {
			unpaid: "bg-amber-100 text-amber-800",
			partial: "bg-sky-100 text-sky-800",
			paid: "bg-emerald-100 text-emerald-800",
			refunded: "bg-slate-200 text-slate-800",
			void: "bg-rose-100 text-rose-800",
		};

		if (!status) return <span className="text-xs text-muted">-</span>;

		return (
			<span
				className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${
					colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
				}`}
			>
				{status}
			</span>
		);
	};

	const formatMoney = (amount?: number) => {
		return new Intl.NumberFormat("en-PH", {
			style: "currency",
			currency: "PHP",
		}).format(Number(amount || 0));
	};

	const columns = [
		{
			key: "start_time" as const,
			label: "Schedule",
			render: (_startTime: string | number, row: Booking) =>
				formatTimeRange(row.start_time, row.end_time),
		},
		{
			key: "court" as const,
			label: "Court",
			render: (courtId: string | number) => {
				const id = Number(courtId);
				return courtsById[id]?.name ?? `Court #${id}`;
			},
		},
		{
			key: "member" as const,
			label: "Member",
			render: (memberId: string | number) => {
				const id = Number(memberId);
				const member = membersById[id];
				return member ? `${member.first_name} ${member.last_name}` : `Member #${id}`;
			},
		},
		{ key: "players_count" as const, label: "Players" },
		{
			key: "payment_progress_status" as const,
			label: "Payment",
			render: (value: string | number) => paymentProgressBadge(String(value || "")),
		},
		{
			key: "balance_due" as const,
			label: "Balance",
			render: (value: string | number) => formatMoney(Number(value)),
		},
		{
			key: "status" as const,
			label: "Status",
			render: (status: string | number) => statusBadge(String(status)),
		},
	];

	const getBookingRowClass = (booking: Booking) => {
		switch (booking.status) {
			case "confirmed":
				return "bg-emerald-50/55 hover:bg-emerald-100/65";
			case "waitlist":
				return "bg-amber-50/55 hover:bg-amber-100/65";
			case "cancelled":
				return "bg-rose-50/55 hover:bg-rose-100/65";
			default:
				return "";
		}
	};

	const getBookingLeadingCellClass = (booking: Booking) => {
		switch (booking.status) {
			case "confirmed":
				return "border-l-2 border-emerald-400";
			case "waitlist":
				return "border-l-2 border-amber-400";
			case "cancelled":
				return "border-l-2 border-rose-400";
			default:
				return "";
		}
	};

	return (
		<>
			<div className="py-2">
				<PageHeader
					title="Bookings"
					description={`Manage ${bookings.length} bookings`}
					action={{ label: "New Booking", onClick: handleAdd }}
				/>

				{error && (
					<div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				<div className="mb-6 rounded-lg border border-line bg-white p-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<label className="mb-2 block text-sm font-medium text-foreground">
								From Date
							</label>
							<input
								type="date"
								value={dateRange.start}
								onChange={(e) => handleDateRangeChange("start", e.target.value)}
								className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-foreground">
								To Date
							</label>
							<input
								type="date"
								value={dateRange.end}
								onChange={(e) => handleDateRangeChange("end", e.target.value)}
								className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
							/>
						</div>
						<div className="flex items-end">
							<button
								onClick={() => setDateRange({ start: "", end: "" })}
								className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
							>
								Clear
							</button>
						</div>
					</div>
				</div>

				<div className="mb-3 text-xs font-medium text-muted">
					Calendar schedule view grouped by date
				</div>

				{loading && (
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
							<p className="mt-2 text-sm text-muted">Loading...</p>
						</div>
					</div>
				)}

				{!loading && groupedBookings.length === 0 && (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-muted">No bookings found for the selected filters</p>
					</div>
				)}

				{!loading && groupedBookings.length > 0 && (
					<div className="space-y-5">
						{groupedBookings.map((group) => (
							<section key={group.dateKey} className="rounded-xl border border-line bg-white p-3 sm:p-4">
								<div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
									<div>
										<h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
										<p className="text-xs text-muted">{group.subtitle}</p>
									</div>
									<span className="rounded-full bg-card-hover px-2 py-1 text-xs font-medium text-foreground">
										{group.items.length} booking{group.items.length > 1 ? "s" : ""}
									</span>
								</div>

								<DataTable
									data={group.items}
									columns={columns}
									onEdit={handleEdit}
									onDelete={handleDelete}
									loading={false}
									rowClassName={getBookingRowClass}
									leadingCellClassName={getBookingLeadingCellClass}
								/>
							</section>
						))}
					</div>
				)}
			</div>

			<BookingFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSuccess={handleFormSuccess}
				initialData={selectedBooking}
			/>
		</>
	);
}
