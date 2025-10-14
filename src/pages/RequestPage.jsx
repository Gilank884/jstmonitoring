import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { RefreshCcw } from "lucide-react";
import { jsPDF } from "jspdf";

export default function RequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Ambil data dari tabel "request"
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("request")
        .select("id, barang, jumlah_barang, status, link_ba")
        .order("id", { ascending: false });

      if (error) throw error;
      setRequests(data || []);

      // setelah data diambil, jalankan auto update PDF
      autoGenerateBA(data || []);
    } catch (err) {
      console.error("Error mengambil data request:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Auto generate BA PDF jika belum ada link_ba
  const autoGenerateBA = async (dataList) => {
    for (const item of dataList) {
      if (!item.link_ba) {
        try {
          const pdf = new jsPDF();
          pdf.setFontSize(18);
          pdf.text("BERITA ACARA PERMINTAAN BARANG", 20, 20);

          pdf.setFontSize(12);
          pdf.text(`ID Request: ${item.id}`, 20, 40);
          pdf.text(`Nama Barang: ${item.barang || "-"}`, 20, 50);
          pdf.text(`Jumlah Barang: ${item.jumlah_barang || "-"}`, 20, 60);
          pdf.text(`Status: ${item.status || "-"}`, 20, 70);

          pdf.text(
            "Dokumen ini dibuat secara otomatis oleh sistem Request Monitoring.",
            20,
            90
          );

          const pdfBlob = pdf.output("blob");
          const filePath = `${item.id}.pdf`;

          // Upload ke Supabase Storage (bucket: request)
          const { error: uploadError } = await supabase.storage
            .from("request")
            .upload(filePath, pdfBlob, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          // URL publik
          const publicUrl = `https://jstmonitoring.netlify.app/.netlify/functions/file?path=request/${filePath}`;

          // Update kolom link_ba di tabel
          const { error: updateError } = await supabase
            .from("request")
            .update({ link_ba: publicUrl })
            .eq("id", item.id);

          if (updateError) throw updateError;

          console.log(`✅ BA untuk ID ${item.id} berhasil dibuat.`);
        } catch (err) {
          console.error(`Gagal membuat BA untuk ID ${item.id}:`, err.message);
        }
      }
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Daftar Request Barang
          </h1>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" />
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Barang</th>
                <th className="px-4 py-3 text-left">Jumlah Barang</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Link BA</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center text-gray-500 py-6 italic"
                  >
                    {loading
                      ? "Sedang memuat data..."
                      : "Belum ada data request"}
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {req.barang || "-"}
                    </td>
                    <td className="px-4 py-3">{req.jumlah_barang || "-"}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        req.status === "Selesai"
                          ? "text-green-600"
                          : req.status === "Proses"
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }`}
                    >
                      {req.status || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {req.link_ba ? (
                        <a
                          href={req.link_ba}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Lihat BA
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Membuat BA...</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
