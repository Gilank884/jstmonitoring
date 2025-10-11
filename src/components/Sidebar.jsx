import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  FiMenu,
  FiHome,
  FiUser,
  FiDatabase,
  FiCheckCircle,
} from "react-icons/fi";

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const menus = [
    { name: "Dashboard", path: "/", icon: <FiHome /> },
    { name: "Profile", path: "/profile", icon: <FiUser /> },
    { name: "Work Order", path: "/workorder", icon: <FiDatabase /> },
    { name: "Close Order", path: "/closeorder", icon: <FiCheckCircle /> },
  ];

  return (
    <div
      className={`h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-gray-200 shadow-2xl flex flex-col transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isOpen && (
          <span className="text-xl font-bold text-white tracking-wide drop-shadow">
            CCTV MONITORING
          </span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-300 hover:text-white transition"
        >
          <FiMenu size={22} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 mt-4 px-2 space-y-2">
        {menus.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-all duration-200 
                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    : "hover:bg-gray-700 hover:text-white text-gray-300"
                }`}
            >
              <span
                className={`text-lg transition ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {item.icon}
              </span>
              {isOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer kecil */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
        {isOpen ? "© 2025 Jagarti Team" : "©"}
      </div>
    </div>
  );
};

export default Sidebar;
