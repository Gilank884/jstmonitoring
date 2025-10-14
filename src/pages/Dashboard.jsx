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
import {
  Wrench,
  ClipboardList,
  Download,
  Upload,
  Search,
  RefreshCcw,
} from "lucide-react";
import { motion } from "framer-motion";

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

function CardContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.warn("No user logged in");
          return;
        }

        // 🔹 Ambil profil user dari tabel users
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("empl_no, role")
          .eq("email", user.email)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 🔹 Set default tanggal awal dan akhir bulan ini
        const now = new Date();
        const firstDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString().split("T")[0];
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).toISOString().split("T")[0];
        setFromDate(firstDay);
        setToDate(lastDay);

        // 🔹 Fetch data pertama kali
        await fetchData(firstDay, lastDay, profileData.empl_no, profileData.role);
      } catch (err) {
        console.error("Init dashboard error:", err.message || err);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, []);

  const fetchData = async (from, to, emplNo, role) => {
    setLoading(true);
    try {
      let query = supabase
        .from("cctv")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to);

      // 🔸 Filter berdasarkan role
      if (role !== "superadmin") {
        query = query.eq("assigned_to", emplNo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Fetch dashboard error:", err.message || err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!profile) return;
    setRefreshing(true);
    await fetchData(fromDate, toDate, profile.empl_no, profile.role);
    setRefreshing(false);
  };

  // Statistik cards
  const totalOpen = orders.filter((o) => o.status === "OPEN").length;
  const totalClose = orders.filter((o) => o.status === "CLOSE").length;
  const totalPending = orders.filter((o) => o.status === "PENDING").length;

  const typeCounts = {
    PM: orders.filter((o) => o.status === "OPEN" && o.type === "PM").length,
    CM: orders.filter((o) => o.status === "OPEN" && o.type === "CM").length,
    INSTALL: orders.filter((o) => o.status === "OPEN" && o.type === "INSTALL").length,
    PULLOUT: orders.filter((o) => o.status === "OPEN" && o.type === "PULLOUT").length,
  };

  const filteredOrders = orders.filter((o) =>
    o.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  // Pie chart
  const pieData = [
    { name: "Open", value: totalOpen },
    { name: "Pending", value: totalPending },
    { name: "Close", value: totalClose },
  ];

  const COLORS = ["#3b82f6", "#facc15", "#22c55e"];

  // Bar chart bulanan
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString("default", { month: "short" }),
    PM: 0,
    CM: 0,
  }));

  orders.forEach((item) => {
    if (!item.created_at) return;
    const date = new Date(item.created_at);
    const m = date.getMonth();
    if (item.type === "PM" && ["CLOSE", "PENDING"].includes(item.status)) months[m].PM++;
    if (item.type === "CM" && ["CLOSE", "PENDING"].includes(item.status)) months[m].CM++;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        Loading dashboard...
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-900 rounded-3xl">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-extrabold mb-10 text-center bg-black bg-clip-text text-transparent drop-shadow-sm"
      >
         JST CCTV DASHBOARD
      </motion.h1>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3">
        <div className="flex items-center border rounded-lg px-3 py-2 w-full md:w-1/3 bg-white shadow-sm">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Cari lokasi..."
            className="outline-none flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <span>-</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardContent className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-2xl mr-4">
              <Wrench className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Preventive</h2>
              <p className="text-3xl font-bold text-blue-600">{typeCounts.PM}</p>
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
              <p className="text-3xl font-bold text-yellow-600">{typeCounts.CM}</p>
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
              <p className="text-3xl font-bold text-green-600">{typeCounts.INSTALL}</p>
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
              <p className="text-3xl font-bold text-red-600">{typeCounts.PULLOUT}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Current Work Distribution (Status)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
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

        <Card>
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Work Orders (Monthly - CLOSE & PENDING)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={months} barGap={8}>
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

      {/* Data Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">No SPK</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-500">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              filteredOrders.map((o, i) => (
                <tr
                  key={o.id ?? i}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3 border-t">{o.no_spk}</td>
                  <td className="px-4 py-3 border-t">
                    {o.created_at
                      ? new Date(o.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 border-t">{o.lokasi}</td>
                  <td className="px-4 py-3 border-t">{o.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
