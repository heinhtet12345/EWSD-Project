import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";

const ROLE_PREFIXES = ["admin", "qa-coordinator", "qa-manager", "staff"];

function getRoleFromPath(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return ROLE_PREFIXES.includes(firstSegment) ? firstSegment : null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const role = getRoleFromPath(pathname);
  const isDashboard = Boolean(role);

  if (isDashboard) {
    return (
      <div className="dashboard-layout">
        <SideBar />
        <Outlet />
      </div>
    );
  }

  return (
    <>
      <Outlet />
    </>
  );
}
