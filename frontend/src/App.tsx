import "./App.css";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import QACoordDashboard from "./pages/QACoordDashboard";
import QAManagerDashboard from "./pages/QAManagerDashboard";
import QAManagerCategoriesPage from "./pages/QAManagerCategoriesPage";
import QAManagerClosurePeriodPage from "./pages/QAManagerClosurePeriodPage";


import StaffDashboard from "./pages/StaffDashboard";
import StaffAllIdeaPage from "./pages/StaffAllIdeaPage";
import StaffMyIdeasPage from "./pages/StaffMyIdeasPage";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./components/common/404NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/*" element={<MainLayout />}>
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="qa_coordinator" element={<QACoordDashboard />} />
        <Route path="qa_manager" element={<QAManagerDashboard />} />
        <Route path="qa_manager/categories" element={<QAManagerCategoriesPage />} />
        <Route path="qa_manager/closure-period" element={<QAManagerClosurePeriodPage />} />
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
