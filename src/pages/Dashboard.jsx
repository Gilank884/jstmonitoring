import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Wrench, ClipboardList, Download, Upload } from "lucide-react";

// Simple Card Components
function Card({ children }) {
  return (
    <div className="shadow-lg rounded-2xl border border-gray-100 bg-white hover:shadow-xl transition">
      {children}
    </div>
  );
}
function CardContent({ children }) {
  return <div className="p-6">{children}</div>;
}

export default function Dashboard() {
  const [counts, setCounts] = useState({ PM: 0, CM: 0, INSTALL: 0, PULLOUT: 0 });
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Ambil semua data dari tabel CCTV
    const { data, error } = await supabase.from("cctv").select("type, created_at");

    if (error) {
      console.error("Error fetching data:", error);
      return;
    }

    // Hitung total berdasarkan type
    const typeCounts = { PM: 0, CM: 0, INSTALL: 0, PULLOUT: 0 };
    data.forEach((item) => {
      if (item.type === "PM") typeCounts.PM++;
      if (item.type === "CM") typeCounts.CM++;
      if (item.type === "INSTALL") typeCounts.INSTALL++;
      if (item.type === "PULLOUT") typeCounts.PULLOUT++;
    });

    setCounts(typeCounts);

    // Hitung data per bulan hanya untuk PM & CM
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      PM: 0,
      CM: 0,
    }));

    data.forEach((item) => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      const m = date.getMonth();
      if (item.type === "PM") months[m].PM++;
      if (item.type === "CM") months[m].CM++;
    });

    setMonthlyData(months);
  }

  const pieData = [
    { name: "Preventive Maintenance", value: counts.PM },
    { name: "Corrective Maintenance", value: counts.CM },
    { name: "Install", value: counts.INSTALL },
    { name: "Pullout", value: counts.PULLOUT },
  ];

  const COLORS = ["#3b82f6", "#facc15", "#22c55e", "#ef4444"];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Wrench className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Preventive</h2>
              <p className="text-2xl font-bold text-gray-900">{counts.PM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-xl mr-4">
              <ClipboardList className="text-yellow-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Corrective</h2>
              <p className="text-2xl font-bold text-gray-900">{counts.CM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <Download className="text-green-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Install</h2>
              <p className="text-2xl font-bold text-gray-900">{counts.INSTALL}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl mr-4">
              <Upload className="text-red-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Pullout</h2>
              <p className="text-2xl font-bold text-gray-900">{counts.PULLOUT}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Work Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} fill="#8884d8" label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Working Order (Monthly)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="PM" fill="#3b82f6" name="Preventive Maintenance" />
                <Bar dataKey="CM" fill="#facc15" name="Corrective Maintenance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
