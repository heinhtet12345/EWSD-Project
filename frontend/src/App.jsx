import "./App.css";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<div>Staff Dashboard</div>} />
        <Route path="admin" element={<div>Admin Dashboard</div>} />
        <Route path="qa-coordinator" element={<div>QA Coordinator Dashboard</div>} />
        <Route path="qa-manager" element={<div>QA Manager Dashboard</div>} />
        <Route path="staff" element={<div>Staff Dashboard</div>} />
      </Route>
    </Routes>
  );
}

export default App;
