import { FiBell, FiUser } from "react-icons/fi";
import { useEffect, useState } from "react";

const Header = ({ title, onLogout }) => {
  const [user, setUser] = useState({
    empl_name: "Guest",
    empl_no: "",
    position: "Karyawan",
  });

  useEffect(() => {
    // Ambil data user dari localStorage saat komponen dimount
    const storedUser = {
      empl_name: localStorage.getItem("empl_name") || "Guest",
      empl_no: localStorage.getItem("empl_no") || "",
      position: localStorage.getItem("position") || "Karyawan",
      photo_url: localStorage.getItem("photo_url") || "/blank.jpg",
    };
    setUser(storedUser);
  }, []);

  const handleLogout = () => {
    // Hapus semua data user dari localStorage
    localStorage.removeItem("empl_name");
    localStorage.removeItem("empl_no");
    localStorage.removeItem("position");
    localStorage.removeItem("photo_url");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
  };

  return (
    <header className="bg-gradient-to-l from-[#89c5f8] to-[#4a7e93] shadow p-4 flex justify-between items-center text-white">
      {/* Judul Halaman */}
      <h1 className="text-xl font-bold">{title}</h1>

      {/* Bagian kanan: notifikasi, user info, logout */}
      <div className="flex items-center space-x-4">
        {/* Notifikasi */}
        <button className="relative hover:opacity-80 transition">
          <FiBell size={20} />
          <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Info user */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <FiUser size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-sm">Hi, {user.empl_name}</span>
            <span className="text-xs opacity-80">{user.position}</span>
          </div>
        </div>

        {/* Tombol Logout */}
        <button
          onClick={handleLogout}
          className="bg-white text-[#4a7e93] px-4 py-1 rounded hover:bg-gray-100 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
