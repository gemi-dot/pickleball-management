"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/Navigation";
import { DataTable } from "@/components/DataTable";
import { MemberFormModal } from "@/components/MemberForm";
import { Member } from "@/lib/api/types";
import { listMembers, deleteMember } from "@/lib/api/members";

export default function MembersPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<Member>();
	const [error, setError] = useState<string>();

	const loadMembers = async (isActive?: string) => {
		setLoading(true);
		try {
			const response = await listMembers({ is_active: isActive });
			setMembers(response.results);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load members");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const isActive = searchParams.get("is_active") || undefined;
		loadMembers(isActive);
	}, [searchParams]);

	const handleAdd = () => {
		setSelectedMember(undefined);
		setIsFormOpen(true);
	};

	const handleEdit = (member: Member) => {
		setSelectedMember(member);
		setIsFormOpen(true);
	};

	const handleDelete = async (member: Member) => {
		if (confirm(`Delete member "${member.first_name} ${member.last_name}"?`)) {
			try {
				await deleteMember(member.id!);
				await loadMembers();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to delete member");
			}
		}
	};

	const handleFormSuccess = () => {
		loadMembers();
	};

	const handleViewProfile = (member: Member) => {
		router.push(`/members/${member.id}`);
	};

	const tierBadge = (tier: string) => {
		const colors = {
			basic: "bg-gray-100 text-gray-800",
			premium: "bg-purple-100 text-purple-800",
			pro: "bg-gold-100 text-gold-800",
		};
		return (
			<span
				className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${
					colors[tier as keyof typeof colors] || "bg-gray-100 text-gray-800"
				}`}
			>
				{tier}
			</span>
		);
	};

	const activeBadge = (isActive: boolean) => {
		return (
			<span
				className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
					isActive
						? "bg-green-100 text-green-800"
						: "bg-red-100 text-red-800"
				}`}
			>
				{isActive ? "Active" : "Inactive"}
			</span>
		);
	};

	const columns = [
		{
			key: "first_name" as const,
			label: "Name",
			render: (_: string | number, row: Member) => (
				<button
					onClick={() => handleViewProfile(row)}
					className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
				>
					{row.first_name} {row.last_name}
				</button>
			),
		},
		{ key: "email" as const, label: "Email" },
		{ key: "phone" as const, label: "Phone" },
		{
			key: "membership_tier" as const,
			label: "Tier",
			render: (tier: string | number) => tierBadge(String(tier)),
		},
		{
			key: "is_active" as const,
			label: "Status",
			render: (isActive: string | number) =>
				activeBadge((isActive as any) === 1 || isActive === "true"),
		},
	];

	return (
		<>
			<div className="py-2">
				<PageHeader
					title="Members"
					description={`Manage ${members.length} members`}
					action={{ label: "New Member", onClick: handleAdd }}
				/>

				{error && (
					<div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				<DataTable
					data={members}
					columns={columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					loading={loading}
				/>
			</div>

			<MemberFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSuccess={handleFormSuccess}
				initialData={selectedMember}
			/>
		</>
	);
}
