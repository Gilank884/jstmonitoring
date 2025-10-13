import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Search, SortAsc, SortDesc, RefreshCcw } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export default function WorkOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // === 🔹 Fetch Data Work Order sesuai user login ===
  async function fetchWorkOrders() {
    setLoading(true);
    try {
      // Ambil user login dari Supabase Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("User belum login");
        setOrders([]);
        return;
      }

      // Ambil empl_no dari tabel users berdasarkan UUID user login
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("empl_no")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.empl_no) {
        console.warn("empl_no user tidak ditemukan");
        setOrders([]);
        return;
      }

      // Ambil data CCTV berdasarkan assigned_to = empl_no user
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, type_mesin, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, jam_problem, type, link_ba, status, created_at, jumlah_channel_dvr, jumlah_kamera, model, jam_mulai, jam_selesai, tanggal_problem, tanggal_mulai, tanggal_selesai"
        )
        .eq("assigned_to", profile.empl_no);

      if (error) throw error;

      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching work orders:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  // === Fungsi load logo dari public folder ===
  async function getLogoBase64() {
    try {
      const res = await fetch("/logo.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Gagal load logo:", err);
      return null;
    }
  }

  // === Fungsi ambil gambar dari storage Supabase ===
  async function fetchImageAsBase64(path) {
    try {
      const { data, error } = await supabase.storage
        .from("workorder")
        .download(path);
      if (error) {
        console.warn("Gagal download gambar:", path, error.message);
        return null;
      }
      const blob = data;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("fetchImageAsBase64 error:", err);
      return null;
    }
  }

  // === FULL CLEAN autoUpdatePDF ===
  const autoUpdatePDF = async (order) => {
    try {
      const logoBase64 = await getLogoBase64();
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // HEADER
      if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 30, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(
        "PT. JAGARTI SARANA TELEKOMUNIKASI",
        148.5,
        15,
        { align: "center" }
      );
      doc.setFontSize(12);
      doc.text("LAPORAN KERJA", 148.5, 22, { align: "center" });

      // Main Box
      const marginX = 5;
      let cursorY = 30;
      doc.setLineWidth(0.5);
      doc.rect(marginX, cursorY, 297 - marginX * 2, 175);

      // Info Header
      const infoY = cursorY + 4;
      doc.setFontSize(10);
      doc.text(`No SPK: ${order.no_spk || "-"}`, marginX + 4, infoY + 6);
      doc.text(
        `Tanggal Problem: ${
          order.created_at
            ? new Date(order.created_at).toLocaleDateString()
            : "-"
        }`,
        marginX + 4,
        infoY + 12
      );
      doc.text(`Lokasi: ${order.lokasi || "-"}`, marginX + 4, infoY + 18);

      // etc... (kode PDF kamu tetap sama)
      // === (skip PDF internal drawing, karena sama persis) ===

      // --- Upload PDF ke Supabase ---
      const pdfBlob = doc.output("blob");
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfFile = new File([arrayBuffer], `${order.no_spk}.pdf`, {
        type: "application/pdf",
      });
      const filePath = `ba/${order.no_spk}.pdf`;

      const { error: uploadErr } = await supabase.storage
        .from("workorder")
        .upload(filePath, pdfFile, { upsert: true });

      if (!uploadErr) {
        const apiLink = `https://jstmonitoring.netlify.app/.netlify/functions/file?path=${filePath}`;
        await supabase
          .from("cctv")
          .update({ link_ba: apiLink })
          .eq("id", order.id);
      }
      return true;
    } catch (err) {
      console.error("Gagal generate PDF:", err.message || err);
      return false;
    }
  };

  // === Handle Refresh (regenerate PDF & reload data) ===
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, jam_problem, type, link_ba, status, created_at, jumlah_channel_dvr, jumlah_kamera, model, jam_mulai, jam_selesai, tanggal_problem, tanggal_mulai, tanggal_selesai"
        )
        .eq("status", "OPEN");

      if (error) throw error;

      await Promise.all((data || []).map((order) => autoUpdatePDF(order)));
      await fetchWorkOrders();
    } catch (err) {
      console.error("Error during refresh:", err.message || err);
    } finally {
      setRefreshing(false);
    }
  };

  // === Filter dan Sort ===
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.lokasi
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const orderDate = o.created_at ? new Date(o.created_at) : null;
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    let matchesDate = true;
    if (from && orderDate < from) matchesDate = false;
    if (to && orderDate > to) matchesDate = false;

    return matchesSearch && matchesDate;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortAsc) return (a.lokasi || "").localeCompare(b.lokasi || "");
    return (b.lokasi || "").localeCompare(a.lokasi || "");
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(sortedOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WorkOrders");
    XLSX.writeFile(workbook, "work_orders.xlsx");
  };

  const getTypeBadge = (type) => {
    if (!type) return "-";
    let color = "bg-gray-300 text-gray-800";
    if (type === "PULLOUT") color = "bg-red-500 text-white";
    if (type === "PM") color = "bg-green-500 text-white";
    if (type === "CM") color = "bg-orange-500 text-white";
    if (type === "INSTALL") color = "bg-blue-500 text-white";
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === "OPEN")
      return (
        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-500 text-white">
          {status}
        </span>
      );
    if (status === "CLOSE")
      return (
        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-gray-500 text-white">
          {status}
        </span>
      );
    if (status === "PENDING")
      return (
        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-500 text-white">
          {status}
        </span>
      );
    return <span>{status}</span>;
  };

  // === Default load (bulan ini) ===
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    setFromDate(firstDay);
    setToDate(lastDay);
    fetchWorkOrders();
  }, []);

  // === RENDER ===
  return (
    <div className="p-6 relative">
      <img
        src="/logo.png"
        alt="Logo"
        className="absolute top-4 left-4 w-20 h-auto"
      />

      <h1 className="text-2xl font-bold mb-6 text-center">Open Data</h1>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3">
        <div className="flex items-center border rounded-lg px-3 py-2 w-full md:w-1/3 bg-white shadow-sm">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Cari lokasi..."
            className="outline-none flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            {sortAsc ? (
              <SortAsc className="w-4 h-4 mr-2" />
            ) : (
              <SortDesc className="w-4 h-4 mr-2" />
            )}
            Sort
          </button>

          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            Export Excel
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">No SPK</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Jam Problem</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Link BA</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="13"
                    className="text-center py-6 text-gray-500"
                  >
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                sortedOrders.map((o, i) => (
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
                    <td className="px-4 py-3 border-t">{o.jam_problem}</td>
                    <td className="px-4 py-3 border-t">{getTypeBadge(o.type)}</td>
                    <td className="px-4 py-3 border-t">
                      {getStatusBadge(o.status)}
                    </td>
                    <td className="px-4 py-3 border-t text-blue-600 underline">
                      {o.link_ba ? (
                        <a
                          href={o.link_ba}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Lihat BA
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
