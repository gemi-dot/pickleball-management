"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { DataTable } from "@/components/DataTable";
import { BookingFormModal } from "@/components/BookingForm";
import { Booking } from "@/lib/api/types";
import { listBookings, deleteBooking } from "@/lib/api/bookings";

export default function BookingsPage() {
	const searchParams = useSearchParams();
	const [bookings, setBookings] = useState<Booking[]>([]);
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

	const columns = [
		{
			key: "start_time" as const,
			label: "Date & Time",
			render: (startTime: string | number) =>
				formatDateTime(String(startTime)),
		},
		{ key: "court" as const, label: "Court" },
		{ key: "member" as const, label: "Member" },
		{ key: "players_count" as const, label: "Players" },
		{
			key: "status" as const,
			label: "Status",
			render: (status: string | number) => statusBadge(String(status)),
		},
	];

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

				<DataTable
					data={bookings}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					loading={loading}
				/>
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
