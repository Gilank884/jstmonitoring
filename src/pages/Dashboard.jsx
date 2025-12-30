import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Wrench,
  ClipboardList,
  Download,
  Upload,
  Search,
  RefreshCcw,
  MapPin,
  ChevronLeft,
  ChevronRight,
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
  const [pmIndex, setPmIndex] = useState(0);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("empl_no, role")
          .eq("email", user.email)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        setFromDate(firstDay);
        setToDate(lastDay);

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
        .lte("created_at", to)
        .order("created_at", { ascending: false });

      if (role !== "superadmin") {
        query = query.contains("assigned_to", [emplNo]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
      setPmIndex(0);
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

  const totalOpen = orders.filter((o) => o.status === "OPEN").length;
  const totalClose = orders.filter((o) => o.status === "CLOSE").length;
  const totalPending = orders.filter((o) => o.status === "PENDING").length;

  const typeCounts = {
    PM: orders.filter((o) => o.type === "PM").length,
    CM: orders.filter((o) => o.type === "CM").length,
    INSTALL: orders.filter((o) => o.type === "INSTALL").length,
    PULLOUT: orders.filter((o) => o.type === "PULLOUT").length,
  };

  const filteredOrders = orders.filter((o) =>
    o.lokasi?.toLowerCase().includes(search.toLowerCase())
  );

  const pmAll = orders.filter((o) => o.type === "PM");
  const pmClose = pmAll.filter((o) => o.status === "CLOSE");
  const progressPM =
    pmAll.length > 0 ? Math.round((pmClose.length / pmAll.length) * 100) : 0;

  const pieData = [
    { name: "Progress", value: progressPM },
    { name: "Remaining", value: 100 - progressPM },
  ];
  const COLORS = ["#4a7e93", "#e5e7eb"];

  const sortedPM = [...pmAll].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latestPM = sortedPM[pmIndex] || null;

  const nextPM = () => {
    if (pmIndex < sortedPM.length - 1) setPmIndex(pmIndex + 1);
  };
  const prevPM = () => {
    if (pmIndex > 0) setPmIndex(pmIndex - 1);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        Loading dashboard...
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-[#4a7e93]/10 to-[#1F3361]/10 text-gray-900 rounded-3xl">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-extrabold mb-10 text-center bg-gradient-to-l from-[#4a7e93] to-[#1F3361] bg-clip-text text-transparent drop-shadow-sm"
      >
        Managed Services Dashboard
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
            className="flex items-center px-4 py-2 bg-[#4a7e93] text-white rounded-lg hover:bg-[#3b6c7e] disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { icon: <Wrench className="text-[#4a7e93]" size={28} />, bg: "bg-blue-50", title: "Preventive", count: typeCounts.PM },
          { icon: <ClipboardList className="text-yellow-600" size={28} />, bg: "bg-yellow-50", title: "Corrective", count: typeCounts.CM },
          { icon: <Download className="text-green-600" size={28} />, bg: "bg-green-50", title: "Install", count: typeCounts.INSTALL },
          { icon: <Upload className="text-red-600" size={28} />, bg: "bg-red-50", title: "Pullout", count: typeCounts.PULLOUT },
        ].map((card, i) => (
          <Card key={i}>
            <CardContent className="flex items-center">
              <div className={`p-3 ${card.bg} rounded-2xl mr-4`}>
                {card.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">{card.title}</h2>
                <p className="text-3xl font-bold">{card.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Chart + PM Terbaru */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Progress Kunjungan Bulanan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            {/* LEFT - Stats */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-1">
                <span>Total PM:</span>
                <span className="font-semibold">{pmAll.length}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-[#4a7e93]">
                <span>Close:</span>
                <span className="font-semibold">{pmClose.length}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-orange-500">
                <span>Open:</span>
                <span className="font-semibold">{totalOpen}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-gray-500">
                <span>Pending:</span>
                <span className="font-semibold">{totalPending}</span>
              </div>
            </div>

            {/* CENTER - Pie */}
            <div className="flex justify-center items-center relative">
              <ResponsiveContainer width={250} height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={90}
                    outerRadius={120}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-5xl font-bold text-[#4a7e93]">{progressPM}%</p>
                <p className="text-gray-600 mt-1">Complete</p>
              </div>
            </div>

            {/* RIGHT - PM Terbaru */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-gray-700">
                <MapPin size={18} className="text-[#4a7e93]" /> PM Terbaru
              </h3>

              {!latestPM ? (
                <p className="text-gray-400 text-sm italic">Belum ada data PM</p>
              ) : (
                <div>
                  <div
                    onClick={() =>
                      latestPM.link_ba && window.open(latestPM.link_ba, "_blank")
                    }
                    className={`cursor-pointer transition rounded-xl p-4 border ${latestPM.status === "CLOSE"
                      ? "bg-green-50 hover:bg-green-100 border-green-200"
                      : "bg-blue-50 hover:bg-blue-100 border-blue-200"
                      }`}
                  >
                    <p className="text-gray-800 font-semibold">{latestPM.lokasi}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(latestPM.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <span
                      className={`inline-block mt-3 px-3 py-1 text-xs rounded-full ${latestPM.status === "CLOSE"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {latestPM.status}
                    </span>
                  </div>

                  {/* Navigasi kanan-kiri */}
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={prevPM}
                      disabled={pmIndex === 0}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition ${pmIndex === 0
                        ? "text-gray-400 border-gray-200 cursor-not-allowed"
                        : "text-[#4a7e93] border-[#4a7e93]/30 hover:bg-[#4a7e93]/10"
                        }`}
                    >
                      <ChevronLeft size={16} /> Sebelumnya
                    </button>

                    <span className="text-xs text-gray-500">
                      {pmIndex + 1} / {sortedPM.length}
                    </span>

                    <button
                      onClick={nextPM}
                      disabled={pmIndex === sortedPM.length - 1}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition ${pmIndex === sortedPM.length - 1
                        ? "text-gray-400 border-gray-200 cursor-not-allowed"
                        : "text-[#4a7e93] border-[#4a7e93]/30 hover:bg-[#4a7e93]/10"
                        }`}
                    >
                      Selanjutnya <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="mt-10 overflow-x-auto bg-white rounded-lg shadow">
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
