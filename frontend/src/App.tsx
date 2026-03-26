import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import QACoordDashboard from "./pages/QACoordDashboard";
import QACoordMyStaffPage from "./pages/QACoordMyStaffPage";
import QAManagerDashboard from "./pages/QAManagerDashboard";
import QAManagerAllIdeasPage from "./pages/QAManagerAllIdeasPage";
import QAManagerDepartmentIdeasPage from "./pages/QAManagerDepartmentIdeasPage";
import QAManagerCategoriesPage from "./pages/QAManagerCategoriesPage";
import ClosurePeriodPage from "./pages/ClosurePeriodPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import ReportListPage from "./pages/ReportListPage";


import StaffDashboard from "./pages/StaffDashboard";
import StaffAllIdeaPage from "./pages/StaffAllIdeaPage";
import StaffMyIdeasPage from "./pages/StaffMyIdeasPage";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./components/common/404NotFound";
import ViewUserTable from "./components/tables/ViewUserTable";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/*" element={<MainLayout />}>
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/all-ideas" element={<StaffAllIdeaPage />} />
        <Route path="admin/users" element={<ViewUserTable />} />
        <Route path="admin/closure-period" element={<ClosurePeriodPage />} />
        <Route path="admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="admin/reports" element={<ReportListPage />} />
        <Route path="qa_coordinator" element={<QACoordDashboard />} />
        <Route path="qa_coordinator/all-ideas" element={<StaffAllIdeaPage />} />
        <Route path="qa_coordinator/my-department" element={<QAManagerDepartmentIdeasPage />} />
        <Route path="qa_coordinator/my-staff" element={<QACoordMyStaffPage />} />
        <Route path="qa_coordinator/review-moderate" element={<QAManagerDepartmentIdeasPage />} />
        <Route path="005" element={<Navigate to="/qa_coordinator/my-department" replace />} />
        <Route path="006" element={<Navigate to="/qa_coordinator/all-ideas" replace />} />
        <Route path="qa_manager" element={<QAManagerDashboard />} />
        <Route path="qa_manager/all-ideas" element={<QAManagerAllIdeasPage />} />
        <Route path="qa_manager/users" element={<ViewUserTable />} />
        <Route path="qa_manager/categories" element={<QAManagerCategoriesPage />} />
        <Route path="qa_manager/reports" element={<ReportListPage />} />
        <Route path="qa_manager/closure-period" element={<ClosurePeriodPage />} />
        <Route path="qa_manager/profile" element={<UserProfilePage />} />
        <Route path="qa_coordinator/profile" element={<UserProfilePage />} />
        <Route path="admin/profile" element={<UserProfilePage />} />
        <Route path="staff" element={<StaffDashboard />} />
        <Route path="staff/all-ideas" element={<StaffAllIdeaPage />} />
        <Route path="staff/my-ideas" element={<StaffMyIdeasPage />} />
        <Route path="staff/profile" element={<UserProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
