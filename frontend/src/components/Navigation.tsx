"use client";

interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
			<div className="w-full">{children}</div>
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
