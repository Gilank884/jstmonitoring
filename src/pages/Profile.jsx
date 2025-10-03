import React from "react";
import { FaHome, FaEnvelope, FaCog } from "react-icons/fa";

export default function RecruitmentContract() {
  // Data karyawan (avatar diambil dari lank.jpg di folder public)
  const employee = {
    name: "Gilang Prasetyo",
    role: "Dev",
    avatar: "/lank.jpg", // ambil dari public/lank.jpg
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Background Header */}
      <div
        className="h-160 bg-cover bg-center rounded-2xl filter grayscale hover:grayscale-0 transition duration-500 ease-in-out"
        style={{ backgroundImage: "url('/employe.jpg')" }}
      ></div>

      {/* Card Profile */}
      <div className="relative max-w-4xl mx-auto -mt-20 bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center">
        {/* Avatar */}
        <img
          src={employee.avatar}
          alt={employee.name}
          className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover"
        />

        {/* Info */}
        <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{employee.name}</h2>
          <p className="text-gray-500">{employee.role}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition">
            <FaHome /> App
          </button>
          <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition">
            <FaEnvelope /> Message
          </button>
          <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition">
            <FaCog /> Settings
          </button>
        </div>
      </div>
    </div>
  );
}
