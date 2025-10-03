import { FiBell, FiUser } from "react-icons/fi";

const Header = ({ title, onLogout }) => {
  const user = JSON.parse(localStorage.getItem("user")) || { name: "Guest" };

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex items-center space-x-4">
        <button className="relative">
          <FiBell size={20} />
          <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center space-x-2">
          <FiUser size={20} />
          <span className="font-medium">Hi, {user.name || "Guest"}</span>
        </div>
        <button
          onClick={onLogout}
          className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;