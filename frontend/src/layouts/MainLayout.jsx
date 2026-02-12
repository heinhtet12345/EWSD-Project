import { Outlet, useLocation } from "react-router-dom";
import SideBar from "../components/SideBar";
import ToolBar from "../components/ToolBar";

const ROLE_PREFIXES = ["admin", "qa-coordinator", "qa-manager", "staff"];

function getRoleFromPath(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return "staff";
  }
  return ROLE_PREFIXES.includes(firstSegment) ? firstSegment : null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const role = getRoleFromPath(pathname);
  const isDashboard = Boolean(role);

  if (isDashboard) {
    return (
      <div className="flex min-h-screen">
        <SideBar role={role} />
        <div
          className="flex min-h-screen flex-1 flex-col"
          style={{
            backgroundColor: "var(--dashboard_bg)",
            color: "var(--dashboard_text)",
          }}
        >
          <ToolBar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
