import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Search, SortAsc, SortDesc, RefreshCcw } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export default function WorkOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    handleRefresh();
  }, []);

  async function fetchWorkOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, type, link_ba, status, created_at"
        )
        .in("status", ["CLOSE", "PENDING"]); // ambil CLOSE & PENDING

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching work orders:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  // ambil foto dari storage sebagai base64
  const fetchImageAsBase64 = async (path) => {
    try {
      const { data: urlData, error } = await supabase.storage
        .from("workorder")
        .createSignedUrl(path, 60);
      if (error) throw error;

      const url = urlData.signedUrl;
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("Gagal fetch gambar");
      const blob = await res.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Gagal load gambar:", path, e.message);
      return null;
    }
  };

  // generate PDF dan update link BA
  const autoUpdatePDF = async (order) => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PT. CCTV SOLUSINDO", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("BERITA ACARA PEMERIKSAAN CCTV", 105, 28, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      let y = 50;
      doc.text(`No SPK: ${order.no_spk || "-"}`, 20, y); y += 10;
      doc.text(`Order Date: ${order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}`, 20, y); y += 10;
      doc.text(`Lokasi: ${order.lokasi || "-"}`, 20, y); y += 10;
      doc.text(`Hardisk: ${order.hardisk || "-"}`, 20, y); y += 10;
      doc.text(`FPS: ${order.fps || "-"}`, 20, y); y += 10;
      doc.text(`DVR Condition: ${order.dvr_condition || "-"}`, 20, y); y += 10;
      doc.text(`Camera Condition: ${order.camera_condition || "-"}`, 20, y); y += 10;
      doc.text(`UPS: ${order.ups || "-"}`, 20, y); y += 10;
      doc.text(`Alarm: ${order.alarm || "-"}`, 20, y); y += 10;
      doc.text(`Panic Button: ${order.panic_button || "-"}`, 20, y); y += 10;
      doc.text(`Type: ${order.type || "-"}`, 20, y); y += 10;
      doc.text(`Status: ${order.status || "-"}`, 20, y);
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.text("Dokumentasi:", 20, y);
      y += 10;

      let x = 20;
      const imgWidth = 80;
      const imgHeight = 60;

      for (let i = 1; i <= 4; i++) {
        const path = `workorder/${order.no_spk}/foto${i}.jpg`;
        const base64 = await fetchImageAsBase64(path);
        if (base64) {
          doc.addImage(base64, "JPEG", x, y, imgWidth, imgHeight);
        } else {
          doc.setFillColor(0, 0, 0);
          doc.rect(x, y, imgWidth, imgHeight, "F");
        }
        x += imgWidth + 10;
        if (i % 2 === 0) { x = 20; y += imgHeight + 10; }
      }

      const pdfBlob = doc.output("blob");
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfFile = new File([arrayBuffer], `${order.no_spk}.pdf`, { type: "application/pdf" });
      const filePath = `ba/${order.no_spk}.pdf`;

      await supabase.storage.from("workorder").upload(filePath, pdfFile, { upsert: true });

      // **pakai domain Netlify kamu**
      const apiLink = `https://jstmonitoring.netlify.app/.netlify/functions/file?path=${filePath}`;
      await supabase.from("cctv").update({ link_ba: apiLink }).eq("id", order.id);

    } catch (err) {
      console.error("Gagal generate PDF:", err.message || err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, type, link_ba, status, created_at"
        )
        .in("status", ["CLOSE", "PENDING"]);
      if (error) throw error;

      // generate PDF parallel
      await Promise.all(data.map(order => autoUpdatePDF(order)));

      await fetchWorkOrders();
    } catch (err) {
      console.error("Error during refresh:", err.message || err);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.lokasi?.toLowerCase().includes(search.toLowerCase());
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
    return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>{type}</span>;
  };

  const getStatusBadge = (status) => {
    if (status === "CLOSE")
      return <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white">{status}</span>;
    if (status === "PENDING")
      return <span className="px-2 py-1 rounded-md text-xs font-semibold bg-orange-500 text-white">{status}</span>;
    return <span>{status}</span>;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Work Order</h1>

      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3">
        <div className="flex items-center border rounded-lg px-3 py-2 w-full md:w-1/3 bg-white shadow-sm">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input type="text" placeholder="Cari lokasi..." className="outline-none flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <span>-</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border rounded-lg" />

          <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            {sortAsc ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
            Sort
          </button>

          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">Export Excel</button>

          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition disabled:opacity-50">
            <RefreshCcw className="w-4 h-4 mr-2" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">No SPK</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Hardisk</th>
                <th className="px-4 py-3">FPS</th>
                <th className="px-4 py-3">DVR Condition</th>
                <th className="px-4 py-3">Camera Condition</th>
                <th className="px-4 py-3">UPS</th>
                <th className="px-4 py-3">Alarm</th>
                <th className="px-4 py-3">Panic Button</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Link BA</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr><td colSpan="13" className="text-center py-6 text-gray-500">Tidak ada data</td></tr>
              ) : (
                sortedOrders.map((o, i) => (
                  <tr key={o.id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 border-t">{o.no_spk}</td>
                    <td className="px-4 py-3 border-t">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 border-t">{o.lokasi}</td>
                    <td className="px-4 py-3 border-t">{o.hardisk}</td>
                    <td className="px-4 py-3 border-t">{o.fps}</td>
                    <td className="px-4 py-3 border-t">{o.dvr_condition}</td>
                    <td className="px-4 py-3 border-t">{o.camera_condition}</td>
                    <td className="px-4 py-3 border-t">{o.ups}</td>
                    <td className="px-4 py-3 border-t">{o.alarm}</td>
                    <td className="px-4 py-3 border-t">{o.panic_button}</td>
                    <td className="px-4 py-3 border-t">{getTypeBadge(o.type)}</td>
                    <td className="px-4 py-3 border-t">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 border-t text-blue-600 underline">
                      {o.link_ba ? <a href={o.link_ba} target="_blank" rel="noreferrer">Link</a> : "-"}
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
