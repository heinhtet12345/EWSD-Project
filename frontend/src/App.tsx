import "./App.css";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import QACoordDashboard from "./pages/QACoordDashboard";
import QAManagerDashboard from "./pages/QAManagerDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import NotFound from "./components/common/404NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/*" element={<MainLayout />}>
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="qa_coordinator" element={<QACoordDashboard />} />
        <Route path="qa_manager" element={<QAManagerDashboard />} />
        <Route path="staff" element={<StaffDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
