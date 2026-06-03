"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { Member, BookingTimeline } from "@/lib/api/types";
import { getMember } from "@/lib/api/members";

interface MemberProfile extends Member {
	bookings_count: number;
	attended_count: number;
	no_show_count: number;
	total_paid: number;
}

interface TimelineEvent {
	id: string;
	type: "booking" | "confirmed" | "cancelled" | "attended" | "no_show" | "paid";
	title: string;
	description: string;
	timestamp: string;
	details: BookingTimeline;
	icon: string;
	color: string;
}

function formatPhpCurrency(amount: number | string): string {
	const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
	}).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

export default function MemberProfilePage() {
	const params = useParams();
	const memberId = params.id as string;
	const memberIdNum = parseInt(memberId, 10);

	const [member, setMember] = useState<MemberProfile>();
	const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		loadMemberProfile();
	}, [memberId]);

	const loadMemberProfile = async () => {
		setLoading(true);
		try {
			// Fetch member detail with stats
			const memberResponse = await getMember(memberIdNum);
			setMember(memberResponse as MemberProfile);

			// Fetch member timeline via API
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
			const timelineResponse = await fetch(
				`${apiBaseUrl}/members/${memberIdNum}/timeline/`
			);
			if (!timelineResponse.ok) throw new Error(`Failed to load timeline: ${timelineResponse.status}`);
			const bookings: BookingTimeline[] = await timelineResponse.json();

			// Convert bookings to timeline events
			const events = bookings.map((booking) => {
				const events: TimelineEvent[] = [];

				// Main booking event
				events.push({
					id: String(booking.id),
					type: "booking",
					title: `${booking.status === "confirmed" ? "Confirmed" : "Waitlist"} Booking`,
					description: `${booking.players_count} players at ${booking.court.name}`,
					timestamp: booking.start_time,
					details: booking,
					icon:
						booking.status === "confirmed"
							? "✓"
							: booking.status === "waitlist"
								? "⏳"
								: "✗",
					color:
						booking.status === "confirmed"
							? "bg-green-100 text-green-800"
							: booking.status === "waitlist"
								? "bg-yellow-100 text-yellow-800"
								: "bg-red-100 text-red-800",
				});

				// Cancellation event
				if (booking.status === "cancelled") {
					events[0] = {
						...events[0],
						type: "cancelled",
						title: "Cancelled Booking",
						icon: "✗",
						color: "bg-red-100 text-red-800",
					};
				}

				// Attendance/No-show events
				if (booking.attended) {
					events.push({
						id: `${booking.id}-attended`,
						type: "attended",
						title: "Attended",
						description: `Attended ${booking.court.name}`,
						timestamp: booking.start_time,
						details: booking,
						icon: "👤",
						color: "bg-blue-100 text-blue-800",
					});
				}

				if (booking.no_show) {
					events.push({
						id: `${booking.id}-no-show`,
						type: "no_show",
						title: "No-Show",
						description: `No-show at ${booking.court.name}`,
						timestamp: booking.start_time,
						details: booking,
						icon: "⚠",
						color: "bg-orange-100 text-orange-800",
					});
				}

				// Payment event
				if (booking.is_paid && booking.paid_at) {
					events.push({
						id: `${booking.id}-paid`,
						type: "paid",
						title: "Payment",
						description: `Paid ${formatPhpCurrency(booking.fee_amount)}`,
						timestamp: booking.paid_at,
						details: booking,
						icon: "💳",
						color: "bg-green-100 text-green-800",
					});
				}

				return events;
			});

			// Flatten and sort events by timestamp
			const allEvents = events.flat().sort((a, b) => {
				return (
					new Date(b.timestamp).getTime() -
					new Date(a.timestamp).getTime()
				);
			});

			setTimeline(allEvents);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load profile");
		} finally {
			setLoading(false);
		}
	};

	if (loading) return <div className="p-4">Loading...</div>;
	if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
	if (!member) return <div className="p-4">Member not found</div>;

	return (
		<div>
			<PageHeader title="Member Profile" />

			<div className="mx-auto max-w-6xl p-4">
				{/* Member header */}
				<div className="mb-8 rounded-lg bg-white p-6 shadow">
					<div className="mb-6">
						<h1 className="text-3xl font-bold">
							{member.first_name} {member.last_name}
						</h1>
						<p className="text-gray-600">{member.email}</p>
						{member.phone && (
							<p className="text-gray-600">{member.phone}</p>
						)}
					</div>

					{/* Stats grid */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="rounded-lg bg-blue-50 p-4">
							<div className="text-sm text-gray-600">Total Bookings</div>
							<div className="text-2xl font-bold text-blue-900">
								{member.bookings_count}
							</div>
						</div>
						<div className="rounded-lg bg-green-50 p-4">
							<div className="text-sm text-gray-600">Attended</div>
							<div className="text-2xl font-bold text-green-900">
								{member.attended_count}
							</div>
						</div>
						<div className="rounded-lg bg-orange-50 p-4">
							<div className="text-sm text-gray-600">No-Shows</div>
							<div className="text-2xl font-bold text-orange-900">
								{member.no_show_count}
							</div>
						</div>
						<div className="rounded-lg bg-purple-50 p-4">
							<div className="text-sm text-gray-600">Total Paid</div>
							<div className="text-2xl font-bold text-purple-900">
								{formatPhpCurrency(member.total_paid)}
							</div>
						</div>
					</div>

					{/* Member info */}
					<div className="mt-6 grid grid-cols-2 gap-4">
						<div>
							<span className="text-gray-600">Tier:</span>
							<span className="ml-2 font-semibold capitalize">
								{member.membership_tier}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Status:</span>
							<span
								className={`ml-2 font-semibold ${member.is_active ? "text-green-600" : "text-red-600"}`}
							>
								{member.is_active ? "Active" : "Inactive"}
							</span>
						</div>
					</div>
				</div>

				{/* Timeline */}
				<div className="rounded-lg bg-white p-6 shadow">
					<h2 className="mb-6 text-2xl font-bold">Activity Timeline</h2>

					{timeline.length === 0 ? (
						<p className="text-gray-500">No activity yet</p>
					) : (
						<div className="space-y-4">
							{timeline.map((event, index) => (
								<div key={`${event.id}-${index}`} className="flex gap-4">
									{/* Timeline line and icon */}
									<div className="flex flex-col items-center">
										<div
											className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 ${event.color}`}
										>
											{event.icon}
										</div>
										{index < timeline.length - 1 && (
											<div className="h-12 w-0.5 bg-gray-200"></div>
										)}
									</div>

									{/* Event content */}
									<div className="flex-1 pb-4">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-semibold">{event.title}</h3>
												<p className="text-sm text-gray-600">
													{event.description}
												</p>
											</div>
											<span className="text-sm text-gray-500">
												{new Date(event.timestamp).toLocaleDateString(
													"en-US",
													{
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													}
												)}
											</span>
										</div>

										{/* Event details */}
										{event.details && (
											<div className="mt-2 text-xs text-gray-500">
												{event.type === "booking" && (
													<div>
														{new Date(
															event.details.start_time
														).toLocaleTimeString()}
														{" - "}
														{new Date(
															event.details.end_time
														).toLocaleTimeString()}
													</div>
												)}
												{event.type === "paid" && (
													<div>
														Amount: {formatPhpCurrency(event.details.fee_amount)}
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
