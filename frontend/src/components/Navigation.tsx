"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
	{
		label: "Dashboard",
		href: "/",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</svg>
		),
	},
	{
		label: "Courts",
		href: "/courts",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18M5 5l14 14M19 5 5 19" />
			</svg>
		),
	},
	{
		label: "Bookings",
		href: "/bookings",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<rect x="3" y="4" width="18" height="18" rx="2" />
				<path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
			</svg>
		),
	},
	{
		label: "Payments",
		href: "/payments",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<rect x="2" y="5" width="20" height="14" rx="2" />
				<path strokeLinecap="round" d="M2 10h20" />
			</svg>
		),
	},
	{
		label: "Reports",
		href: "/reports",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2z" />
			</svg>
		),
	},
	{
		label: "Calendar",
		href: "/calendar",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<rect x="3" y="4" width="18" height="18" rx="2" />
				<path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
				<path strokeLinecap="round" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth={2.5} />
			</svg>
		),
	},
	{
		label: "Messages",
		href: "/messages",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
			</svg>
		),
	},
];

function Sidebar() {
	const pathname = usePathname();

	const isActive = (href: string) => {
		if (href === "/") return pathname === "/";
		return pathname.startsWith(href);
	};

	return (
		<aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-[#122620] text-white">
			{/* Logo */}
			<div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
					<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<circle cx="12" cy="12" r="9" />
						<path strokeLinecap="round" d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" />
						<path strokeLinecap="round" d="M5 7l2 2M17 7l2-2M5 17l2-2M17 17l2 2" />
					</svg>
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-widest text-white/60 leading-none">Pickleball</p>
					<p className="text-sm font-bold text-white leading-tight">Management</p>
				</div>
			</div>

			{/* Nav */}
			<nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
				{NAV_ITEMS.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
							isActive(item.href)
								? "bg-accent text-white"
								: "text-white/70 hover:bg-white/10 hover:text-white"
						}`}
					>
						{item.icon}
						{item.label}
					</Link>
				))}
			</nav>

			{/* Footer */}
			<div className="px-5 py-4 border-t border-white/10">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent font-semibold text-sm">
						A
					</div>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-white">Admin User</p>
						<p className="truncate text-xs text-white/50">Super Admin</p>
					</div>
				</div>
			</div>
		</aside>
	);
}

interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	return (
		<div className="flex min-h-screen">
			<Sidebar />
			<main className="flex-1 pl-56">
				<div className="mx-auto max-w-5xl px-6 py-8">
					{children}
				</div>
			</main>
		</div>
	);
}

interface PageHeaderProps {
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
	return (
		<div className="mb-8 flex items-center justify-between">
			<div>
				<h1 className="text-3xl font-bold text-foreground">{title}</h1>
				{description && (
					<p className="mt-1 text-sm text-muted">{description}</p>
				)}
			</div>
			{action && (
				<button
					onClick={action.onClick}
					className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
				>
					+ {action.label}
				</button>
			)}
		</div>
	);
}
