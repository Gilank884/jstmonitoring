import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Search, SortAsc, SortDesc, RefreshCcw } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export default function WorkOrder() {
  // data + UI state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [emplNo, setEmplNo] = useState(null);
  const [role, setRole] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // --- init default date range to current month ---
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
  }, []);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1)));

  // === 🔥 MAIN FETCH FUNCTION ===
  const handleRefresh = useCallback(
    async (from, to, _emplNo, _role) => {
      setRefreshing(true);
      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = supabase
          .from("cctv")
          .select(
            "id,no_spk,lokasi,type,link_ba,status,created_at,teknisi,waktu_problem,waktu_mulai,waktu_selesai,serial_alarm,model_alarm,merk_alarm,st_alarm,sc_alarm,status_alarm,serial_antrian,model_antrian,merk_antrian,sc_antrian,status_antrian,st_antrian,jumlah_channel_dvr,jumlah_kamera,serial_lama,kapasitas_lama,sisa_lama,st_lama,serial_baru,kapasitas_baru,sisa_baru,st_baru,mulai_record,selesai_record,waktu_record,firmware_dvr,catatan_pelanggan,row_tiga,serial_tiga,model_tiga,merk_tiga,st_tiga,sc_tiga,status_tiga,row_empat,serial_empat,model_empat,merk_empat,st_empat,sc_empat,status_empat,pelanggan",
            { count: "exact" }
          )
          .eq("status", ("OPEN"))
          .range(start, end)
          .order("created_at", { ascending: false });

        if (_role?.toLowerCase() !== "superadmin") {
          query = query.contains("assigned_to", [_emplNo]);
        }

        if (from) query = query.gte("created_at", new Date(from).toISOString());
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          query = query.lte("created_at", toEnd.toISOString());
        }

        const { data, count, error } = await query;
        if (error) throw error;

        console.log("📦 Data fetched:", data);
        setOrders(data || []);
        setTotalCount(count ?? 0);

        // 🚀 generate BA otomatis jika belum ada
        for (const order of data) {
          console.log("Generate BA otomatis untuk:", order.no_spk);
          await autoUpdatePDF(order);
        }
      } catch (err) {
        console.error("Error during refresh:", err);
      } finally {
        setRefreshing(false);
      }
    },
    [page, pageSize]
  );

  // === STEP 1: FETCH PROFILE ===
  useEffect(() => {
    if (!fromDate || !toDate) return; // tunggu tanggal terisi

    let mounted = true;
    const fetchProfileAndFirstPage = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("empl_no, role")
          .eq("email", user.email)
          .single();

        if (mounted) {
          setEmplNo(profile?.empl_no ?? null);
          setRole(profile?.role ?? null);

          if (profile?.empl_no && profile?.role) {
            console.log("🔁 First auto refresh (profile ready)");
            await handleRefresh(fromDate, toDate, profile.empl_no, profile.role);
          }
        }
      } catch (err) {
        console.error("Init profile error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfileAndFirstPage();
    return () => {
      mounted = false;
    };
  }, [fromDate, toDate, handleRefresh]);

  // === STEP 2: AUTO REFRESH WHEN PARAMS CHANGE ===
  useEffect(() => {
    if (!emplNo || !role || !fromDate || !toDate) return;
    console.log("🔁 Auto refresh triggered with:", {
      emplNo,
      role,
      fromDate,
      toDate,
    });
    handleRefresh(fromDate, toDate, emplNo, role);
  }, [emplNo, role, fromDate, toDate, page, pageSize, handleRefresh]);

  // --- small helpers ---
  const onChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const onChangePageSize = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  // (lanjutan render sama seperti punyamu)


  // --- load logo (public) ---
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

  // --- fetch image from Supabase storage as base64 ---
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

  // === autoUpdatePDF (tetap seperti versi kamu, hanya dipindah di sini) ===
  const autoUpdatePDF = async (order) => {
    try {
      const logoBase64 = await getLogoBase64();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // ===== WATERMARK BESAR (TENGAH) =====
    if (logoBase64) {
      // Simpan grafik state agar tidak ganggu elemen lain
      doc.saveGraphicsState();
      // Atur transparansi (semakin kecil semakin pudar)
      doc.setGState(new doc.GState({ opacity: 0.1 }));

      // Hitung posisi tengah (A4 landscape: 297x210 mm)
      const pageW = 297;
      const pageH = 210;

      // Tentukan ukuran logo besar (proporsional)
      const logoW = 200; // lebar 200mm
      const logoH = 200 * (1 / 1.5); // asumsikan rasio lebar:tinggi logo ≈ 3:1 → bisa kamu ubah sesuai bentuk logo
      const logoX = (pageW - logoW) / 2;
      const logoY = (pageH - logoH) / 2;

      // Tambahkan logo besar samar di tengah halaman
      try {
        doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
      } catch (err) {
        console.warn("❌ Gagal menambahkan watermark:", err);
      }

      // Kembalikan state grafis agar elemen berikutnya tidak ikut transparan
      doc.restoreGraphicsState();
    }

    // ===== HEADER =====
    if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 30, 25);
      doc.setFont("helvetica", "bold");

          // Teks kiri: PT. JAGARTI ...
      doc.setFontSize(8);
      doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", 45, 16);

          // Teks kanan: LAPORAN KERJA (lebih besar, sejajar)
      doc.setFontSize(35);
      doc.text("LAPORAN KERJA", 210, 23, { align: "right" });


      // ===== MAIN BOX =====
      const marginX = 5;
      let cursorY = 30;
      doc.setLineWidth(0.5);
      doc.rect(marginX, cursorY, 298 - marginX * 2, 178);

      // ===== INFO HEADER (3 kolom) =====
      const infoY = cursorY + 4;
      doc.setFontSize(10);

      // left col
      doc.text(`No SPK: ${order.no_spk || "-"}`, marginX + 4, infoY + 6);
      doc.text(
        `Tanggal Problem: ${
          order.waktu_problem ? new Date(order.waktu_problem).toLocaleDateString() : "-"
        }`,
        marginX + 4,
        infoY + 12
      );
      doc.text(`Lokasi: ${order.lokasi || "-"}`, marginX + 4, infoY + 18);
      doc.text(`Dilaporkan Oleh: ${order.teknisi || "-"}`, marginX + 4, infoY + 24);

      // middle col
      const midColX = 130;
      doc.text(`Tanggal Problem: ${order.waktu_problem || "-"}`, midColX, infoY + 6);
      doc.text(`Tanggal Mulai: ${order.waktu_mulai || "-"}`, midColX, infoY + 12);
      doc.text(`Tanggal Selesai: ${order.waktu_selesai || "-"}`, midColX, infoY + 18);

      
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
        {
          no: "3",
          type_mesin: order.row_tiga || "-",
          serial_number: order.serial_tiga || "-",
          model: order.model_tiga || "-",
          merk: order.merk_tiga || "-",
          st: order.st_tiga || "-",
          sc: order.sc_tiga || "-",
          status_keterangan: order.status_tiga || "-",
        },
        {
          no: "4",
          type_mesin: order.row_empat || "-",
          serial_number: order.serial_empat || "-",
          model: order.model_empat || "-",
          merk: order.merk_empat || "-",
          st: order.st_empat || "-",
          sc: order.sc_empat || "-",
          status_keterangan: order.status_empat || "-",
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

      const pmY = tableY + 6;
      const pmX = marginX + 2;

      doc.setFont("helvetica", "bold");
      doc.text("URAIAN PEKERJAAN:", pmX + 4, pmY);
      doc.setFont("helvetica", "normal");

      const pmTextStartY = pmY + 6;
      const masalah =
        order.permasalahan ||
        `Backup Data / Cek Data CCTV (${order.lokasi || "-"})\nJumlah Channel DVR: ${
          order.jumlah_channel_dvr || "-"
        }\nJumlah Kamera: ${order.jumlah_kamera || "-"}`;

      const pmLines = String(masalah).split("\n");
      const pmBoxHeight = pmLines.length * 6 + 7;

      doc.rect(pmX, pmY - 6, 278, pmBoxHeight);
      pmLines.forEach((ln, idx) => doc.text(ln, pmX + 6, pmTextStartY + idx * 6));

      // ===== PENYELESAIAN =====
      const penyY = pmY + pmBoxHeight + 0;
      const penyX = pmX;
      doc.setFont("helvetica", "bold");
      doc.text("PENYELESAIAN:", penyX + 4, penyY);
      doc.setFont("helvetica", "normal");

      const penyTextStartY = penyY + 6;
      const penyelesaian = order.penyelesaian || "Backup HDD Lama / Baru";
      const lineHeight = 6;
      const totalLines = 7;
      const penyBoxHeight = totalLines * lineHeight;
      doc.rect(penyX, penyY - 6, 278, penyBoxHeight);
      doc.text(penyelesaian, penyX + 6, penyTextStartY);

      // ===== POSISI KOLOM =====
      const colLamaX = penyX + 6;      // kiri
      const colBaruX = penyX + 95;     // tengah
      const colHistoryX = penyX + 185; // kanan

      // ===== KOLOM HDD LAMA & BARU =====
      const dataPairs = [
        { left: `SN HDD Lama : ${order.serial_lama || "-"}`, right: `SN HDD Baru : ${order.serial_baru || "-"}` },
        { left: `Kapasitas   : ${order.kapasitas_lama || "-"}`, right: `Kapasitas   : ${order.kapasitas_baru || "-"}` },
        { left: `Sisa        : ${order.sisa_lama || "-"}`, right: `Sisa        : ${order.sisa_baru || "-"}` },
        { left: `ST          : ${order.st_lama || "-"}`, right: `ST          : ${order.st_baru || "-"}` },
      ];

      // ===== KOLOM HISTORY BACKUP DATA =====
      doc.setFont("helvetica", "bold");
      doc.text("History Backup Data:", colHistoryX, penyTextStartY + lineHeight - 8);
      doc.setFont("helvetica", "normal");

      const historyPairs = [
        { left: `Mulai Tanggal   : ${order.mulai_record || "-"}` },
        { left: `Sampai Tanggal  : ${order.selesai_record || "-"}` },
        { left: `Tanggal Record  : ${order.waktu_record || "-"}` },
        { left: `Firmware DVR    : ${order.firmware_dvr || "-"}` },
      ];

      // ===== RENDER 3 KOLOM SEJAJAR =====
      const maxRows = Math.max(dataPairs.length, historyPairs.length);
      for (let i = 0; i < maxRows; i++) {
        const y = penyTextStartY + (i + 0.8) * lineHeight;

        // kolom kiri (HDD Lama)
        if (dataPairs[i]?.left) doc.text(dataPairs[i].left, colLamaX, y);

        // kolom tengah (HDD Baru)
        if (dataPairs[i]?.right) doc.text(dataPairs[i].right, colBaruX, y);

        // kolom kanan (History)
        if (historyPairs[i]?.left) doc.text(historyPairs[i].left, colHistoryX, y);
      }


      // ===== CATATAN PELANGGAN =====
      const noteY = penyY + penyBoxHeight + 0;
      const noteHeight = 13;
      const noteWidth = 278;
      doc.setFont("helvetica", "bold");
      doc.text("CATATAN PELANGGAN:", penyX + 4, noteY);
      doc.setFont("helvetica", "normal");
      doc.rect(penyX, noteY - 6, noteWidth, noteHeight);
      doc.text(order.catatan_pelanggan || "-", penyX + 6, noteY + 4, { maxWidth: noteWidth - 12 });

      // ===== TANDA TANGAN (fix posisi dan proporsi) =====
      const signH = 23;
      const totalWidth = noteWidth;
      const signGap = 0;
      const signW = (totalWidth - signGap) / 2;
      const signY = noteY + noteHeight - 6;

      const signLeftX = penyX;
      const signRightX = signLeftX + signW + signGap;

      // --- Kotak Pelanggan ---
      doc.rect(signLeftX, signY, signW, signH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Mengetahui Pelanggan", signLeftX + 1, signY + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Nama Pelanggan: ${order.pelanggan || "-"}`, signLeftX + 1, signY + signH - 1);

      try {
        const { data: signPublic } = supabase.storage
          .from("workorder")
          .getPublicUrl(`workorder/${order.no_spk}/tanda2.png`);

        if (signPublic?.publicUrl) {
          const response = await fetch(signPublic.publicUrl);
          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });

            // Gunakan Image untuk tahu rasio asli
            const img = new Image();
            img.src = base64;
            await new Promise((resolve) => (img.onload = resolve));

            const ratio = img.width / img.height;
            const maxW = signW * 0.8;  // sedikit margin kiri kanan
            const maxH = signH * 0.8;  // sedikit margin atas bawah

            let imgWidth = maxW;
            let imgHeight = imgWidth / ratio;
            if (imgHeight > maxH) {
              imgHeight = maxH;
              imgWidth = imgHeight * ratio;
            }

            const imgX = signLeftX + (signW - imgWidth) / 2;
            const imgY = signY + (signH - imgHeight) / 2;
            doc.addImage(base64, "PNG", imgX, imgY, imgWidth, imgHeight);
          }
        }
      } catch (e) {
        console.warn("❌ Gagal menambahkan tanda tangan pelanggan:", e);
      }

      // --- Kotak PT JAGARTI ---
      doc.rect(signRightX, signY, signW, signH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", signRightX + 1, signY + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Nama Teknisi: ${order.teknisi || "-"}`, signRightX + 1, signY + signH - 1);

      try {
        const { data: signJagarti } = supabase.storage
          .from("workorder")
          .getPublicUrl(`workorder/${order.no_spk}/tanda1.png`);

        if (signJagarti?.publicUrl) {
          const response = await fetch(signJagarti.publicUrl);
          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });

            const img = new Image();
            img.src = base64;
            await new Promise((resolve) => (img.onload = resolve));

            const ratio = img.width / img.height;
            const maxW = signW * 0.8;
            const maxH = signH * 0.8;

            let imgWidth = maxW;
            let imgHeight = imgWidth / ratio;
            if (imgHeight > maxH) {
              imgHeight = maxH;
              imgWidth = imgHeight * ratio;
            }

            const imgX = signRightX + (signW - imgWidth) / 2;
            const imgY = signY + (signH - imgHeight) / 2;
            doc.addImage(base64, "PNG", imgX, imgY, imgWidth, imgHeight);
          }
        }
      } catch (e) {
        console.warn("❌ Gagal menambahkan tanda tangan JAGARTI:", e);
      }      
   
      for (let page = 2; page <= 3; page++) {
        doc.addPage({ orientation: "landscape", unit: "mm", format: "a4" });

        // ===== HEADER (sama seperti Page 1) =====
        if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 25, 20); // logo lebih kecil agar pas
        doc.setFont("helvetica", "bold");

        // Teks kiri: PT. JAGARTI ...
        doc.setFontSize(8);
        doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", 45, 16);

        // Teks kanan: LAPORAN KERJA (lebih besar, sejajar)
        doc.setFontSize(35);
        doc.text("LAPORAN KERJA", 210, 23, { align: "right" });

        // ===== FOTO (2 kolom × 2 baris) =====
        const imgW = 110;
        const imgH = 70;
        const imgStartX = 20;
        let imgX = imgStartX;
        let imgY = 38;

        const startIdx = (page - 2) * 4 + 1;
        const endIdx = startIdx + 3;

        for (let i = startIdx; i <= endIdx; i++) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`FOTO ${i}`, imgX + 2, imgY);

          const path = `workorder/${order.no_spk}/foto${i}.jpg`;
          const base64 = await fetchImageAsBase64(path);

          // --- Gambar border di setiap slot ---
          doc.setDrawColor(0); // hitam
          doc.rect(imgX, imgY + 4, imgW, imgH); // border luar foto

          if (base64) {
            try {
              doc.addImage(base64, "JPEG", imgX, imgY + 4, imgW, imgH);
            } catch {
              doc.setFillColor(230, 230, 230);
              doc.rect(imgX, imgY + 4, imgW, imgH, "F"); // abu-abu isi kalau gagal
              doc.rect(imgX, imgY + 4, imgW, imgH); // border ulang biar tetap kelihatan
            }
          } else {
            doc.setFillColor(230, 230, 230);
            doc.rect(imgX, imgY + 4, imgW, imgH, "F");
            doc.rect(imgX, imgY + 4, imgW, imgH); // border ulang untuk slot kosong
          }

          // pindah posisi (2 kolom × 2 baris)
          if (i % 2 === 1) {
            imgX = imgStartX + imgW + 15;
          } else {
            imgX = imgStartX;
            imgY += imgH + 25;
          }
        }
      }


            // upload file to supabase storage
            const pdfBlob = doc.output("blob");
            const arrayBuffer = await pdfBlob.arrayBuffer();
            const pdfFile = new File([arrayBuffer], `${order.no_spk}.pdf`, {
              type: "application/pdf",
            });
            const filePath = `ba/${order.no_spk}.pdf`;

            const { error: uploadErr } = await supabase.storage.from("workorder").upload(filePath, pdfFile, {
              upsert: true,
            });

            if (uploadErr) {
              console.error("Upload PDF error:", uploadErr);
            } else {
              const apiLink = `https://jstmonitoring.netlify.app/.netlify/functions/file?path=${filePath}`;
              const { error: updateErr } = await supabase.from("cctv").update({ link_ba: apiLink }).eq("id", order.id);
              if (updateErr) {
                console.error("Update link_ba error:", updateErr);
              }
            }

            return true;
          } catch (err) {
            console.error("Gagal generate PDF:", err.message || err);
            return false;
          }
        };

  // --- client-side filtered & sorted view (applies on current page set returned by server) ---
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.lokasi?.toLowerCase().includes(search.toLowerCase());
    // date filter already applied server-side by created_at when fetching; but we keep additional safety
    return matchesSearch;
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

      <h1 className="text-2xl font-bold mb-6 text-center">Close Data</h1>

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
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <span>-</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border rounded-lg" />

          <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            {sortAsc ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
            Sort
          </button>

          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">
            Export Excel
          </button>

          <button
            onClick={() => handleRefresh(fromDate, toDate, emplNo, role)}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

         {orders.length === 0 && loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow relative">
          {loading && (
      <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
         <div className="loader relative">
                <span><span></span><span></span><span></span><span></span></span>
                <div className="base">
                  <span></span>
                  <div className="face"></div>
                </div>
              </div>
              <div className="longfazers">
                <span></span><span></span><span></span><span></span>
              </div>
              <p className="mt-6 text-gray-700 font-semibold text-lg animate-pulse">
                Memuat data baru... harap tunggu
              </p>
            </div>
          )}
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">No SPK</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Lokasi</th>
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
                    <td className="px-4 py-3 border-t">{getTypeBadge(o.type)}</td>
                    <td className="px-4 py-3 border-t">{getStatusBadge(o.status)}</td>
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

          {/* PAGINATION CONTROL */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChangePage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() => onChangePage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages} — {totalCount} items
              </span>

              <label className="text-sm text-gray-600">Per page:</label>
              <select
                value={pageSize}
                onChange={(e) => onChangePageSize(Number(e.target.value))}
                className="px-3 py-1 border rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


