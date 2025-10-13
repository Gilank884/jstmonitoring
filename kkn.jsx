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
    // Default bulan ini
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    setFromDate(firstDay);
    setToDate(lastDay);

    handleRefresh(firstDay, lastDay);
  }, []);

  async function fetchWorkOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, type_mesin, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, jam_problem, type, link_ba, status, created_at"
        )
        .eq("status", "OPEN"); // hanya ambil OPEN

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching work orders:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  

  // fungsi load logo dari public
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

// fungsi baru → tambahkan ini
async function fetchImageAsBase64(path) {
  try {
    const { data, error } = await supabase.storage.from("workorder").download(path);
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




// ===== FULL CLEAN autoUpdatePDF =====
const autoUpdatePDF = async (order) => {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // ===== HEADER =====
    if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 30, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", 148.5, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("LAPORAN KERJA", 148.5, 22, { align: "center" });

    // ===== MAIN BOX =====
    const marginX = 5;
    let cursorY = 30;
    doc.setLineWidth(0.5);
    doc.rect(marginX, cursorY, 297 - marginX * 2, 175);

    // ===== INFO HEADER (3 kolom) =====
    const infoY = cursorY + 4;
    doc.setFontSize(10);

    // left col
    doc.text(`No SPK: ${order.no_spk || "-"}`, marginX + 4, infoY + 6);
    doc.text(
      `Tanggal Problem: ${
        order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"
      }`,
      marginX + 4,
      infoY + 12
    );
    doc.text(`Lokasi: ${order.lokasi || "-"}`, marginX + 4, infoY + 18);
    doc.text(`Dilaporkan Oleh: ${order.dilaporkan_oleh || "-"}`, marginX + 4, infoY + 24);

    // middle col
    const midColX = 130;
    doc.text(`Tanggal Problem: ${order.tanggal_problem || "-"}`, midColX, infoY + 6);
    doc.text(`Tanggal Mulai: ${order.tanggal_mulai || "-"}`, midColX, infoY + 12);
    doc.text(`Tanggal Selesai: ${order.tanggal_selesai || "-"}`, midColX, infoY + 18);

    // right col
    const sideColX = 180;
    doc.text(`Jam Problem: ${order.jam_problem || "-"}`, sideColX, infoY + 6);
    doc.text(`Jam Mulai: ${order.jam_mulai || "-"}`, sideColX, infoY + 12);
    doc.text(`Jam Selesai: ${order.jam_selesai || "-"}`, sideColX, infoY + 18);

    // ===== TABLE EQUIPMENT =====
    const tableStartY = infoY + 30;
    doc.line(marginX + 2, tableStartY - 2, 297 - marginX - 2, tableStartY - 2);

    doc.setFont("helvetica", "bold");
    const tableX = marginX + 2;
    let tableY = tableStartY;
    const colWidths = [8, 55, 55, 45, 45, 10, 10, 50];
    const headers = ["No", "Type Mesin", "Serial Number", "Model", "Merk", "ST", "SC", "Status/Ket"];

    let cx = tableX;
    for (let i = 0; i < headers.length; i++) {
      doc.rect(cx, tableY, colWidths[i], 8);
      doc.text(headers[i], cx + 2, tableY + 6);
      cx += colWidths[i];
    }

    // data
    doc.setFont("helvetica", "normal");
    const dataRows = [
      {
        no: "1",
        type_mesin: "Alarm",
        serial_number: order.serial_alarm || "-",
        model: order.model_alarm || "-",
        merk: order.merk_alarm || "-",
        st: order.st_alarm || "-",
        sc: order.sc_alarm || "-",
        status_keterangan: order.status_alarm || "-",
      },
      {
        no: "2",
        type_mesin: "Antrian",
        serial_number: order.serial_antrian || "-",
        model: order.model_antrian || "-",
        merk: order.merk_antrian || "-",
        st: order.st_antrian || "-",
        sc: order.sc_antrian || "-",
        status_keterangan: order.status_antrian || "-",
      },
    ];

    tableY += 8;
    for (const row of dataRows) {
      cx = tableX;
      for (let i = 0; i < colWidths.length; i++) {
        doc.rect(cx, tableY, colWidths[i], 8);
        cx += colWidths[i];
      }

      doc.text(row.no, tableX + 2, tableY + 6);
      doc.text(row.type_mesin, tableX + 10, tableY + 6);
      doc.text(row.serial_number, tableX + 65, tableY + 6);
      doc.text(row.model, tableX + 120, tableY + 6);
      doc.text(row.merk, tableX + 165, tableY + 6);
      doc.text(row.st, tableX + 210, tableY + 6);
      doc.text(row.sc, tableX + 220, tableY + 6);
      doc.text(row.status_keterangan, tableX + 235, tableY + 6);
      tableY += 8;
    }

    // ===== PERMASALAHAN =====
    const pmY = tableY + 6;
    const pmX = marginX + 2;

    doc.setFont("helvetica", "bold");
    doc.text("PERMASALAHAN:", pmX + 4, pmY);
    doc.setFont("helvetica", "normal");

    const pmTextStartY = pmY + 6;
    const masalah =
      order.permasalahan ||
      `Backup Data / Cek Data CCTV (${order.lokasi || "-"})\nJumlah Channel DVR: ${
        order.jumlah_channel_dvr || "-"
      }\nJumlah Kamera: ${order.jumlah_kamera || "-"}`;

    const pmLines = String(masalah).split("\n");
    const pmBoxHeight = pmLines.length * 6 + 12;

    doc.rect(pmX, pmY - 6, 130, pmBoxHeight);
    pmLines.forEach((ln, idx) => doc.text(ln, pmX + 6, pmTextStartY + idx * 6));

    // ===== PENYELESAIAN =====
    const penyY = pmY + pmBoxHeight + 2;
    const penyX = pmX;
    doc.setFont("helvetica", "bold");
    doc.text("PENYELESAIAN:", penyX + 4, penyY);
    doc.setFont("helvetica", "normal");

    const penyTextStartY = penyY + 6;
    const penyelesaian = order.penyelesaian || "Backup HDD Lama / Baru";
    const lineHeight = 6;
    const totalLines = 9;
    const penyBoxHeight = totalLines * lineHeight + 14;
    doc.rect(penyX, penyY - 6, 130, penyBoxHeight);
    doc.text(penyelesaian, penyX + 6, penyTextStartY);

    const rightColX = penyX + 70;
    const dataPairs = [
      { left: `SN HDD Lama: ${order.history_backup || "-"}`, right: `SN HDD Baru: ${order.firmware_dvr || "-"}` },
      { left: `Kapasitas: ${order.sn_lama || "-"}`, right: `Kapasitas: ${order.sn_baru || "-"}` },
      { left: `Sisa: ${order.sisa_lama || "-"}`, right: `Sisa: ${order.sisa_baru || "-"}` },
      { left: `ST: ${order.st_lama || "-"}`, right: `ST: ${order.st_baru || "-"}` },
    ];

    dataPairs.forEach((pair, idx) => {
      const y = penyTextStartY + (idx + 1) * lineHeight;
      doc.text(pair.left, penyX + 6, y);
      doc.text(pair.right, rightColX, y);
    });

    doc.setFont("helvetica", "bold");
    doc.text("History Backup Data:", penyX + 4, penyTextStartY + (dataPairs.length + 1) * lineHeight + 2);
    doc.setFont("helvetica", "normal");

    const historyY = penyTextStartY + (dataPairs.length + 2) * lineHeight;
    const historyPairs = [
      { left: `Mulai Tanggal: ${order.mulai_tanggal || "-"}`, right: `Mulai Jam: ${order.mulai_jam || "-"}` },
      { left: `Sampai Tanggal: ${order.sampai_tanggal || "-"}`, right: `Sampai Jam: ${order.sampai_jam || "-"}` },
      { left: `Tanggal Record: ${order.tanggal_record || "-"}`, right: `Jam Record: ${order.jam_record || "-"}` },
      { left: `Firmware DVR: ${order.firmware_dvr || "-"}`, right: "" },
    ];

    historyPairs.forEach((pair, idx) => {
      const y = historyY + idx * lineHeight;
      doc.text(pair.left, penyX + 6, y);
      if (pair.right) doc.text(pair.right, rightColX, y);
    });

    // ===== CATATAN PELANGGAN =====
    const noteY = penyY + penyBoxHeight + 2;
    const noteHeight = 13;
    const noteWidth = 283;
    doc.setFont("helvetica", "bold");
    doc.text("CATATAN PELANGGAN:", penyX + 4, noteY);
    doc.setFont("helvetica", "normal");
    doc.rect(penyX, noteY - 6, noteWidth, noteHeight);
    doc.text(order.catatan_pelanggan || "-", penyX + 6, noteY + 4, { maxWidth: noteWidth - 12 });

    // ===== TANDA TANGAN (fix posisi) =====
 const signH = 40;
const signW = 130;
const signGap = 0;
let signY = noteY + noteHeight + - 115;




const signX = penyX + 145;; // satu kolom posisi kiri

doc.setDrawColor(0);
doc.setLineWidth(0.5);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);

// ===== Kotak PELANGGAN (atas) =====
doc.rect(signX, signY, signW, signH);
doc.text(
  "Mengetahui Pelanggan",
  signX + signW / 2,
  signY + signH - 6,
  { align: "center" }
);

// ===== Kotak PT JAGARTI (bawah) =====
const jagartiY = signY + signH + signGap;
doc.rect(signX, jagartiY, signW, signH);
doc.text(
  "PT. JAGARTI SARANA TELEKOMUNIKASI",
  signX + signW / 2,
  jagartiY + signH - 6,
  { align: "center" }
);


      // --- PAGE 2: DOKUMENTASI (no header) ---
      doc.addPage({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("DOKUMENTASI PEKERJAAN", 148.5, 15, { align: "center" });

      // Four-photo grid (2x2)
      const imgW = 135;
      const imgH = 90;
      const imgStartX = 10;
      let imgX = imgStartX;
      let imgY = 25;
      for (let i = 1; i <= 4; i++) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`FOTO ${i}`, imgX + 2, imgY);
        const path = `workorder/${order.no_spk}/foto${i}.jpg`;
        const base64 = await fetchImageAsBase64(path);
        if (base64) {
          try {
            doc.addImage(base64, "JPEG", imgX, imgY + 5, imgW, imgH);
          } catch (e) {
            // fallback to placeholder rect if image add fails
            doc.setFillColor(230, 230, 230);
            doc.rect(imgX, imgY + 5, imgW, imgH, "F");
          }
        } else {
          doc.setFillColor(230, 230, 230);
          doc.rect(imgX, imgY + 5, imgW, imgH, "F");
        }

        // next position
        if (i % 2 === 1) {
          imgX = imgStartX + imgW + 10;
        } else {
          imgX = imgStartX;
          imgY += imgH + 30;
        }
      }

      // --- Upload ke Supabase ---
      const pdfBlob = doc.output("blob");
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfFile = new File([arrayBuffer], `${order.no_spk}.pdf`, {
        type: "application/pdf",
      });
      const filePath = `ba/${order.no_spk}.pdf`;

      // upload (upsert)
      const { error: uploadErr } = await supabase.storage
        .from("workorder")
        .upload(filePath, pdfFile, { upsert: true });

      if (uploadErr) {
        console.error("Upload PDF error:", uploadErr);
      } else {
        // create public/signed link via your existing API (kept same as sebelumnya)
        const apiLink = `https://jstmonitoring.netlify.app/.netlify/functions/file?path=${filePath}`;
        const { error: updateErr } = await supabase
          .from("cctv")
          .update({ link_ba: apiLink })
          .eq("id", order.id);
        if (updateErr) {
          console.error("Update link_ba error:", updateErr);
        }
      }

      // (optional) return doc for preview if needed
      return true;
    } catch (err) {
      console.error("Gagal generate PDF:", err.message || err);
      return false;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("cctv")
        .select(
          "id, no_spk, lokasi, hardisk, fps, dvr_condition, camera_condition, ups, alarm, panic_button, jam_problem, type, link_ba, status, created_at, jumlah_channel_dvr, jumlah_kamera, model, jam_problem, jam_mulai, jam_selesai, tanggal_problem, tanggal_mulai, tanggal_selesai"
        )
        .eq("status", "OPEN"); // hanya ambil OPEN

      if (error) throw error;
      // generate untuk masing-masing order (heavy op)
      await Promise.all((data || []).map((order) => autoUpdatePDF(order)));
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

  return (
    <div className="p-6 relative">
      <img src="/logo.png" alt="Logo" className="absolute top-4 left-4 w-20 h-auto" />

      <h1 className="text-2xl font-bold mb-6 text-center">Open Data</h1>

      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3">
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
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            {sortAsc ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
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
                  <td colSpan="13" className="text-center py-6 text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                sortedOrders.map((o, i) => (
                  <tr key={o.id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 border-t">{o.no_spk}</td>
                    <td className="px-4 py-3 border-t">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 border-t">{o.lokasi}</td>
                    
                    <td className="px-4 py-3 border-t">{o.jam_problem}</td>
                    <td className="px-4 py-3 border-t">{getTypeBadge(o.type)}</td>
                    <td className="px-4 py-3 border-t">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 border-t text-blue-600 underline">
                        {o.link_ba ? (
                          <a href={o.link_ba} target="_blank" rel="noopener noreferrer">
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
