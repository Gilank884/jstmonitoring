import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Download, Loader2, FileArchive, AlertCircle } from "lucide-react";

export default function ReportPage() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("users").select("empl_no, role, empl_name").eq("email", user.email).single();
                setUserProfile(data);
            }
        };
        fetchProfile();
    }, []);

    const handleDownloadZip = async () => {
        if (!userProfile) return;
        setLoading(true);
        setError(null);
        setProgress("Menyiapkan data...");
        setStats({ total: 0, success: 0, failed: 0 });

        try {
            // 1. Fetch Orders
            let query = supabase
                .from("cctv")
                .select("no_spk, link_ba, created_at")
                .in("status", ["CLOSE", "PENDING"])
                .not("link_ba", "is", null) // Filter yang punya link_ba
                .neq("link_ba", "")
                .neq("link_ba", "-");

            if (userProfile.role?.toLowerCase() !== "superadmin") {
                query = query.contains("assigned_to", [userProfile.empl_no]);
            }

            const { data: orders, error: fetchError } = await query;
            if (fetchError) throw fetchError;

            if (!orders || orders.length === 0) {
                setError("Tidak ada data laporan (BA) yang ditemukan untuk diunduh.");
                setLoading(false);
                return;
            }

            const total = orders.length;
            setStats({ total, success: 0, failed: 0 });

            // 2. Init Zip
            const zip = new JSZip();
            const folder = zip.folder(`Laporan_BA_${userProfile.empl_no}_${new Date().toISOString().split('T')[0]}`);

            // 3. Download Process
            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < total; i++) {
                const order = orders[i];
                const fileName = `${order.no_spk}.pdf`;
                setProgress(`Mengunduh ${i + 1}/${total}: ${order.no_spk}`);

                try {
                    // Coba download langsung dari storage supaya lebih cepat & aman
                    // Asumsi path standar: ba/{no_spk}.pdf
                    const { data: blob, error: storageError } = await supabase.storage
                        .from("workorder")
                        .download(`ba/${order.no_spk}.pdf`);

                    if (storageError) {
                        // Fallback: jika tidak ada di storage path standar, coba fetch dari URL link_ba
                        // Note: link_ba mungkin ke endpoint function, kita coba fetch biasa
                        console.warn(`Storage download failed for ${order.no_spk}, trying fetch URL...`);
                        const response = await fetch(order.link_ba);
                        if (!response.ok) throw new Error("Fetch failed");
                        const blobFromUrl = await response.blob();
                        folder.file(fileName, blobFromUrl);
                    } else {
                        folder.file(fileName, blob);
                    }
                    successCount++;
                } catch (err) {
                    console.error(`Failed to download BA for ${order.no_spk}`, err);
                    failedCount++;
                    // Buat file teks error sebagai ganti PDF
                    folder.file(`${order.no_spk}_ERROR.txt`, `Gagal mengunduh PDF: ${err.message}`);
                }

                setStats({ total, success: successCount, failed: failedCount });
            }

            setProgress("Membuat file ZIP...");
            const zipContent = await zip.generateAsync({ type: "blob" });
            saveAs(zipContent, `Laporan_BA_${userProfile.empl_name.replace(/\s+/g, '_')}.zip`);

            setProgress("Selesai!");
        } catch (err) {
            console.error("Zip error:", err);
            setError(err.message || "Terjadi kesalahan saat memproses data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Report Center</h1>
            <p className="text-gray-600 mb-8">Unduh arsip lengkap Berita Acara (BA) pekerjaan Anda.</p>

            <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-indigo-50 rounded-full">
                        <FileArchive className="w-16 h-16 text-indigo-600" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-2">Download Semua Laporan</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Fitur ini akan mengumpulkan seluruh file PDF Berita Acara (BA) dari pekerjaan Anda yang berstatus CLOSE atau PENDING, lalu mengunduhnya dalam satu file ZIP.
                </p>

                {error && (
                    <div className="mb-6 mx-auto max-w-md p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-left text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {!loading ? (
                    <button
                        onClick={handleDownloadZip}
                        className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all transform hover:-translate-y-0.5 shadow-md"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Download Laporan (ZIP)
                    </button>
                ) : (
                    <div className="max-w-md mx-auto">
                        <div className="flex items-center justify-center gap-3 mb-4 text-indigo-700 font-semibold animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{progress}</span>
                        </div>

                        {stats.total > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${((stats.success + stats.failed) / stats.total) * 100}%` }}
                                ></div>
                            </div>
                        )}

                        {stats.total > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>Total: {stats.total}</span>
                                <span className="text-green-600">Berhasil: {stats.success}</span>
                                <span className="text-red-500">Gagal: {stats.failed}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
