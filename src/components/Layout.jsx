import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ title, isLoggedIn, onLogout }) => {
  // Tidak perlu Navigate lagi di sini
  // Karena proteksi sudah di App.jsx
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} onLogout={onLogout} />
        <main className="p-6 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
