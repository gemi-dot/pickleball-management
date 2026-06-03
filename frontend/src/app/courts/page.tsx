"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { DataTable } from "@/components/DataTable";
import { CourtFormModal } from "@/components/CourtForm";
import { Court } from "@/lib/api/types";
import { listCourts, deleteCourt } from "@/lib/api/courts";

export default function CourtsPage() {
	const searchParams = useSearchParams();
	const [courts, setCourts] = useState<Court[]>([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedCourt, setSelectedCourt] = useState<Court>();
	const [error, setError] = useState<string>();

	const loadCourts = async (status?: string) => {
		setLoading(true);
		try {
			const response = await listCourts({ status });
			setCourts(response.results);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load courts");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const status = searchParams.get("status") || undefined;
		loadCourts(status);
	}, [searchParams]);

	const handleAdd = () => {
		setSelectedCourt(undefined);
		setIsFormOpen(true);
	};

	const handleEdit = (court: Court) => {
		setSelectedCourt(court);
		setIsFormOpen(true);
	};

	const handleDelete = async (court: Court) => {
		if (confirm(`Delete court "${court.name}"?`)) {
			try {
				await deleteCourt(court.id!);
				await loadCourts();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to delete court");
			}
		}
	};

	const handleFormSuccess = () => {
		loadCourts();
	};

	const statusBadge = (status: string) => {
		const colors = {
			available: "bg-green-100 text-green-800",
			booked: "bg-blue-100 text-blue-800",
			maintenance: "bg-yellow-100 text-yellow-800",
		};
		return (
			<span
				className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
					colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
				}`}
			>
				{status}
			</span>
		);
	};

	const columns = [
		{ key: "name" as const, label: "Name" },
		{
			key: "is_indoor" as const,
			label: "Type",
			render: (isIndoor: string | number) =>
				(isIndoor as any) === 1 || isIndoor === "true" ? "Indoor" : "Outdoor",
		},
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
					title="Courts"
					description={`Manage ${courts.length} courts`}
					action={{ label: "New Court", onClick: handleAdd }}
				/>

				{error && (
					<div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				<DataTable
					data={courts}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					loading={loading}
				/>
			</div>

			<CourtFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSuccess={handleFormSuccess}
				initialData={selectedCourt}
			/>
		</>
	);
}
