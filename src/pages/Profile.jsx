
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProfilePage() {
  const [employee, setEmployee] = useState({
    empl_name: "User",
    role: "Karyawan",
    photo_url: "/lank.jpg",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        // ✅ Ambil empl_no dari localStorage (diset saat login sukses)
        const emplNo = localStorage.getItem("empl_no");
        if (!emplNo) {
          console.warn("empl_no tidak ditemukan di localStorage. Pastikan diset waktu login.");
          return;
        }

        // ✅ Query ke tabel users
        const { data, error } = await supabase
          .from("users")
          .select("empl_name, role, photo_url")
          .eq("empl_no", emplNo)
          .single();

        if (error) throw error;

        setEmployee({
          empl_name: data.empl_name || "User",
          role: data.role || "Karyawan",
          photo_url: data.photo_url && data.photo_url !== "" 
            ? data.photo_url 
            : "/lank.jpg", // fallback foto default
        });
      } catch (err) {
        console.error("Error fetching employee:", err.message);
      }
    };

    fetchEmployee();
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md text-center">
        {/* FOTO PROFIL */}
        <img
          src={employee.photo_url}
          alt={employee.empl_name}
          className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover mx-auto"
        />

        {/* NAMA */}
        <h2 className="text-2xl font-semibold mt-4">{employee.empl_name}</h2>
        {/* ROLE */}
        <p className="text-gray-600">{employee.role}</p>
      </div>
    </div>
  );
}
