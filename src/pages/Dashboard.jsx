import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Wrench, ClipboardList, Download, Upload } from "lucide-react";
import { motion } from "framer-motion";

// Glass Card Components
function Card({ children }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-lg"
    >
      {children}
    </motion.div>
  );
}
function CardContent({ children }) {
  return <div className="p-6">{children}</div>;
}

export default function Dashboard() {
  const [counts, setCounts] = useState({
    PM: 0,
    CM: 0,
    INSTALL: 0,
    PULLOUT: 0,
  });
  const [statusCounts, setStatusCounts] = useState({
    OPEN: 0,
    PENDING: 0,
    CLOSE: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from("cctv")
      .select("type, status, created_at");

    if (error) {
      console.error("Error fetching data:", error);
      return;
    }

    // --- 4 Kotak Atas (Hanya status OPEN) ---
    const typeCounts = { PM: 0, CM: 0, INSTALL: 0, PULLOUT: 0 };
    data.forEach((item) => {
      if (item.status === "OPEN") {
        if (item.type === "PM") typeCounts.PM++;
        if (item.type === "CM") typeCounts.CM++;
        if (item.type === "INSTALL") typeCounts.INSTALL++;
        if (item.type === "PULLOUT") typeCounts.PULLOUT++;
      }
    });
    setCounts(typeCounts);

    // --- Pie Chart (Hitung Status: OPEN, PENDING, CLOSE) ---
    const statusCount = { OPEN: 0, PENDING: 0, CLOSE: 0 };
    data.forEach((item) => {
      if (item.status === "OPEN") statusCount.OPEN++;
      if (item.status === "PENDING") statusCount.PENDING++;
      if (item.status === "CLOSE") statusCount.CLOSE++;
    });
    setStatusCounts(statusCount);

    // --- Monthly Chart (Hanya PM & CM dengan status CLOSE atau PENDING) ---
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      PM: 0,
      CM: 0,
    }));

    data.forEach((item) => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      const m = date.getMonth();

      if (item.type === "PM" && (item.status === "CLOSE" || item.status === "PENDING")) {
        months[m].PM++;
      }
      if (item.type === "CM" && (item.status === "CLOSE" || item.status === "PENDING")) {
        months[m].CM++;
      }
    });

    setMonthlyData(months);
  }

  // Pie data berdasarkan STATUS
  const pieData = [
    { name: "Open", value: statusCounts.OPEN },
    { name: "Pending", value: statusCounts.PENDING },
    { name: "Close", value: statusCounts.CLOSE },
  ];

  const COLORS = ["#3b82f6", "#facc15", "#22c55e"];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-900 rounded-3xl">
      {/* Judul Dashboard */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-extrabold mb-10 text-center 
                   bg-white
                   bg-clip-text text-transparent drop-shadow-sm"
      >
        ⚡ Smart CCTV Dashboard
      </motion.h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-2xl mr-4">
              <Wrench className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Preventive</h2>
              <p className="text-3xl font-bold text-blue-600">{counts.PM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-2xl mr-4">
              <ClipboardList className="text-yellow-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Corrective</h2>
              <p className="text-3xl font-bold text-yellow-600">{counts.CM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-green-100 rounded-2xl mr-4">
              <Download className="text-green-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Install</h2>
              <p className="text-3xl font-bold text-green-600">{counts.INSTALL}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-red-100 rounded-2xl mr-4">
              <Upload className="text-red-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Pullout</h2>
              <p className="text-3xl font-bold text-red-600">{counts.PULLOUT}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Current Work Distribution (Status)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "12px",
                    border: "1px solid #d1d5db",
                  }}
                  itemStyle={{ color: "#111827" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Work Orders (Monthly - CLOSE & PENDING)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "12px",
                    border: "1px solid #d1d5db",
                  }}
                  itemStyle={{ color: "#111827" }}
                />
                <Legend />
                <Bar
                  dataKey="PM"
                  name="Preventive Maintenance"
                  fill="url(#gradBlue)"
                  radius={[10, 10, 0, 0]}
                />
                <Bar
                  dataKey="CM"
                  name="Corrective Maintenance"
                  fill="url(#gradYellow)"
                  radius={[10, 10, 0, 0]}
                />
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#fde68a" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
