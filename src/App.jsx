import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import WorkOrder from "./pages/WorkOrder.jsx";
import CloseOrder from "./pages/CloseOrder.jsx";
import RequestPage from "./pages/RequestPage.jsx"; // ✅ import RequestPage
import Inventory from "./pages/Inventory.jsx"

// ProtectedRoute wrapper
function ProtectedRoute({ isAuthenticated }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = sessionStorage.getItem("isAuthenticated");
    setIsAuthenticated(storedAuth === "true");
    setLoading(false);
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          }
        />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route
            path="/"
            element={<Layout isLoggedIn={isAuthenticated} onLogout={handleLogout} />}
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="workorder" element={<WorkOrder />} />
            <Route path="closeorder" element={<CloseOrder />} />
            <Route path="request" element={<RequestPage />} /> {/* ✅ Tambahan */}
            <Route path="Inventory" element={<Inventory />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}
