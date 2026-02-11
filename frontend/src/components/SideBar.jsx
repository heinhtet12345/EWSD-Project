import { useEffect, useState } from "react";
import {
	Menu,
	LayoutDashboard,
	Users,
	FileText,
	Calendar,
	ShieldCheck,
	BarChart3,
	User,
	LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const ROLE_TABS = {
	"admin": [
		{ label: "Dashboard", to: "/", icon: LayoutDashboard },
		{ label: "Manage Closure Period", to: "/008", icon: Calendar },
		{ label: "Manage Staffs", to: "/007", icon: Users },
	],
	"qa-coordinator": [
		{ label: "Dashboard", to: "/", icon: LayoutDashboard },
		{ label: "All Ideas", to: "/006", icon: FileText },
		{ label: "Review and Moderate Ideas", to: "/005", icon: ShieldCheck },
	],
	"qa-manager": [
		{ label: "Dashboard", to: "/", icon: LayoutDashboard },
		{ label: "All Ideas", to: "/003", icon: FileText },
		{ label: "Statistical Analysis", to: "/004", icon: BarChart3 },
	],
	staff: [
		{ label: "Dashboard", to: "/", icon: LayoutDashboard },
		{ label: "All Ideas", to: "/001", icon: FileText },
		{ label: "My Ideas", to: "/002", icon: User },
	],
};

export default function SideBar({ role = "staff" }) {
	const tabs = ROLE_TABS[role] || ROLE_TABS.staff;
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 768px)");
		const handleChange = (event) => {
			setIsCollapsed(event.matches);
		};

		handleChange(mediaQuery);
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return (
		<aside className="h-screen">
			<nav
				className={`h-full flex flex-col border-r shadow-sm text-white transition-all duration-200 ${
					isCollapsed ? "w-16" : "w-[200px]"
				}`}
				style={{ backgroundColor: "var(--sidebar_bg)" }}
			>
				<div
					className={
						isCollapsed
							? "pt-4 pb-2 px-2 flex items-center justify-start overflow-hidden"
							: "p-4 pb-2 flex items-center justify-between gap-3 overflow-hidden"
					}
				>
					{!isCollapsed && (
						<h1 className="text-lg font-semibold whitespace-nowrap -mt-0.5">
							Quality System
						</h1>
					)}
					<button
						type="button"
						aria-label="Toggle menu"
						aria-pressed={isCollapsed}
						className={`p-2 rounded-md hover:bg-white/10 ${
							isCollapsed ? "ml-0.5" : ""
						}`}
						onClick={() => setIsCollapsed((value) => !value)}
					>
						<Menu className="h-6 w-6" />
					</button>
				</div>
				<ul className={`flex-1 space-y-1 mt-6 ${isCollapsed ? "px-2" : "px-3"}`}>
					{tabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<li key={tab.to}>
								<NavLink
									to={tab.to}
									className={({ isActive }) =>
										`group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
											isActive
												? "text-white"
												: "text-white/80 hover:bg-white/10 hover:text-white"
										}`
									}
									style={({ isActive }) => ({
										backgroundColor: isActive ? "var(--sidebar-active_tab)" : "transparent",
									})}
									end
								>
									<Icon className="h-5 w-5 shrink-0" />
									<span
										className={`whitespace-nowrap ${isCollapsed ? "hidden" : "inline"}`}
									>
										{tab.label}
									</span>
									<span
										className={`absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition ${
											isCollapsed ? "group-hover:opacity-100" : "hidden"
										}`}
									>
										{tab.label}
									</span>
								</NavLink>
							</li>
						);
					})}
				</ul>

				<div className="border-t p-3">
					<button
						type="button"
						className={`group relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${
							isCollapsed ? "justify-center" : ""
						}`}
					>
						<LogOut className="h-5 w-5 shrink-0" />
						<span className={isCollapsed ? "hidden" : "inline"}>Logout</span>
						<span
							className={`absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition ${
								isCollapsed ? "group-hover:opacity-100" : "hidden"
							}`}
						>
							Logout
						</span>
					</button>
				</div>

            </nav>
        </aside>
	);
}

