"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { gsap } from "gsap";
import { MapPin, Calendar, Briefcase, Mail, UserCircle } from "lucide-react";

export default function ProfilePage() {
  const [employee, setEmployee] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const emplNo = localStorage.getItem("empl_no");
        if (!emplNo) {
          console.warn("empl_no tidak ditemukan di localStorage.");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select(
            `
            empl_no, empl_name, occupation, birth_place_city, birth_place_district,
            birth_date, address, department, join_date, position, grade, level,
            service_point, role, photo_url, email, username
            `
          )
          .eq("empl_no", emplNo)
          .single();

        if (error) throw error;
        setEmployee(data);
      } catch (err) {
        console.error("Error fetching employee:", err.message);
      }
    };

    fetchEmployee();
  }, []);

  useEffect(() => {
    if (employee && cardRef.current) {
      gsap.fromTo(
        cardRef.current.children,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    }
  }, [employee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600 animate-pulse">Memuat data karyawan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center p-8">
      <div
        ref={cardRef}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-3xl transition-all duration-300"
      >
        {/* FOTO & NAMA */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src={
              employee.photo_url && employee.photo_url !== ""
                ? employee.photo_url
                : "/blank.jpg"
            }
            alt={employee.empl_name}
            className="w-32 h-32 rounded-full border-4 border-blue-200 shadow-md object-cover"
          />
          <h2 className="text-3xl font-bold mt-4 text-gray-800">
            {employee.empl_name}
          </h2>
          <p className="text-blue-600 font-medium">{employee.role}</p>
        </div>

        {/* INFORMASI UTAMA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <InfoItem label="Nomor Karyawan" value={employee.empl_no} icon={<UserCircle size={16} />} />
          <InfoItem label="Posisi" value={employee.position} icon={<Briefcase size={16} />} />
          <InfoItem label="Departemen" value={employee.department} icon={<Briefcase size={16} />} />
          <InfoItem label="Level" value={employee.level} />
          <InfoItem label="Grade" value={employee.grade} />
          <InfoItem label="Lokasi Kerja" value={employee.service_point} icon={<MapPin size={16} />} />
          <InfoItem label="Alamat" value={employee.address} />
          <InfoItem
            label="Tempat Lahir"
            value={`${employee.birth_place_district || "-"}, ${employee.birth_place_city || "-"}`}
          />
          <InfoItem
            label="Tanggal Lahir"
            value={formatDate(employee.birth_date)}
            icon={<Calendar size={16} />}
          />
          <InfoItem label="Tanggal Bergabung" value={formatDate(employee.join_date)} />
          <InfoItem label="Email" value={employee.email} icon={<Mail size={16} />} />
          <InfoItem label="Username" value={employee.username} />
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 JST Monitoring — Profile Information</p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }) {
  return (
    <div className="flex items-center gap-2 border border-gray-100 rounded-lg p-3 hover:shadow-md hover:border-blue-100 transition">
      {icon && <div className="text-blue-500">{icon}</div>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-800">{value || "-"}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
