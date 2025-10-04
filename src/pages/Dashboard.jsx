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
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl"
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
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase.from("cctv").select("type, created_at");

    if (error) {
      console.error("Error fetching data:", error);
      return;
    }

    const typeCounts = { PM: 0, CM: 0, INSTALL: 0, PULLOUT: 0 };
    data.forEach((item) => {
      if (item.type === "PM") typeCounts.PM++;
      if (item.type === "CM") typeCounts.CM++;
      if (item.type === "INSTALL") typeCounts.INSTALL++;
      if (item.type === "PULLOUT") typeCounts.PULLOUT++;
    });

    setCounts(typeCounts);

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

  const COLORS = ["#60a5fa", "#fbbf24", "#34d399", "#f87171"];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-3xl">
      {/* Judul Dashboard */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-extrabold mb-10 text-center 
                   bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 
                   bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]"
      >
        ⚡ Smart CCTV Dashboard
      </motion.h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-blue-500/20 rounded-2xl mr-4">
              <Wrench className="text-blue-400" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Preventive</h2>
              <p className="text-3xl font-bold text-blue-400">{counts.PM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-yellow-500/20 rounded-2xl mr-4">
              <ClipboardList className="text-yellow-400" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Corrective</h2>
              <p className="text-3xl font-bold text-yellow-400">{counts.CM}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-2xl mr-4">
              <Download className="text-green-400" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Install</h2>
              <p className="text-3xl font-bold text-green-400">{counts.INSTALL}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-red-500/20 rounded-2xl mr-4">
              <Upload className="text-red-400" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Pullout</h2>
              <p className="text-3xl font-bold text-red-400">{counts.PULLOUT}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Current Work Distribution
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
                    backgroundColor: "#111827",
                    borderRadius: "12px",
                    border: "1px solid #374151",
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Work Orders (Monthly)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderRadius: "12px",
                    border: "1px solid #374151",
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
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
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.8} />
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
