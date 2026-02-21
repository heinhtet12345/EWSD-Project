import { Outlet, useLocation } from "react-router-dom";
import SideBar from "../components/common/SideBar";
import ToolBar from "../components/common/ToolBar";

const ROLE_PREFIXES = ["admin", "qa_coordinator", "qa_manager", "staff"] as const;

type Role = (typeof ROLE_PREFIXES)[number];

function getRoleFromPath(pathname: string): Role | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return "staff";
  }
  return ROLE_PREFIXES.includes(firstSegment as Role) ? (firstSegment as Role) : null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const role = getRoleFromPath(pathname);

  if (role) {
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
