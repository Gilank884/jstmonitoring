import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatBubble from "./ChatBubble"; 

const Layout = ({ title, isLoggedIn, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-100 relative">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title={title} onLogout={onLogout} />
        <main className="p-6 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* ✅ Bubble Chat mengambang di kanan bawah */}
      <ChatBubble />
    </div>
  );
};

export default Layout;
