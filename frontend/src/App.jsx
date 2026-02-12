import "./App.css";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./components/common/404NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/*" element={<MainLayout />}>
        <Route path="admin" element={<div>Admin Dashboard</div>} />
        <Route path="qa-coordinator" element={<div>QA Coordinator Dashboard</div>} />
        <Route path="qa-manager" element={<div>QA Manager Dashboard</div>} />
        <Route path="staff" element={<div>Staff Dashboard</div>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    
  );
}

export default App;
