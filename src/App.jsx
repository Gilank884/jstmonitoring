import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import WorkOrder from "./pages/WorkOrderList.jsx";
import WorkOrderDetail from "./pages/WorkOrderDetail.jsx";
import CloseOrder from "./pages/CloseOrderList.jsx";
import CloseOrderDetail from "./pages/CloseOrderDetail.jsx";
import RequestPage from "./pages/RequestPage.jsx";
import Inventory from "./pages/Inventory.jsx";
import ChatBubble from "./components/ChatBubble.jsx";
import ReportIssue from "./pages/ReportIssue.jsx";
import ReportPage from "./pages/ReportPage.jsx";

// ProtectedRoute wrapper
function ProtectedRoute({ isAuthenticated }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    setIsAuthenticated(storedAuth === "true");
    setLoading(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="relative">
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route
              path="/"
              element={
                <Layout
                  isLoggedIn={isAuthenticated}
                  onLogout={handleLogout}
                />
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="workorder" element={<WorkOrder />} />
              <Route path="workorder/:id" element={<WorkOrderDetail />} />
              <Route path="closeorder" element={<CloseOrder />} />
              <Route path="closeorder/:id" element={<CloseOrderDetail />} />
              <Route path="close-order-detail/:id" element={<CloseOrderDetail />} />
              <Route path="request" element={<RequestPage />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reportissue" element={<ReportIssue />} />
              <Route path="report" element={<ReportPage />} />
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? "/" : "/login"} replace />
            }
          />
        </Routes>

        {/* ✅ Bubble chat hanya tampil kalau sudah login */}
        {isAuthenticated && <ChatBubble />}
      </div>
    </Router>
  );
}
