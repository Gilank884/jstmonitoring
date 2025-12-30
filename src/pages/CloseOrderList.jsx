import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import WorkOrderFilters from "../components/WorkOrderFilters";
import WorkOrderTable from "../components/WorkOrderTable";
import * as XLSX from "xlsx";
import { Loader2 } from "lucide-react";
import { generateBA } from "../utils/pdfGenerator";

export default function CloseOrderList() {
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

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // batch processing state
    const [batchStatus, setBatchStatus] = useState({
        active: false,
        current: 0,
        total: 0,
        currentSPK: "",
        errors: []
    });

    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
        setFromDate(firstDay);
        setToDate(lastDay);
    }, []);

    const totalPages = Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1)));

    const fetchOrders = useCallback(async (_page = page, _pageSize = pageSize) => {
        try {
            setLoading(true);
            const start = (_page - 1) * _pageSize;
            const end = start + _pageSize - 1;

            let query = supabase
                .from("cctv")
                .select("id,no_spk,lokasi,type,link_ba,status,created_at,teknisi", { count: "exact" })
                .in("status", ["CLOSE", "PENDING"])
                .range(start, end)
                .order("created_at", { ascending: false });

            if (role?.toLowerCase() !== "superadmin") query = query.contains("assigned_to", [emplNo]);
            if (fromDate) query = query.gte("created_at", new Date(fromDate).toISOString());
            if (toDate) {
                const toEnd = new Date(toDate);
                toEnd.setHours(23, 59, 59, 999);
                query = query.lte("created_at", toEnd.toISOString());
            }

            const { data, count, error } = await query;
            if (error) throw error;
            setOrders(data || []);
            setTotalCount(count ?? 0);
        } catch (err) {
            console.error("Fetch close orders error:", err);
        } finally {
            setLoading(false);
        }
    }, [emplNo, role, fromDate, toDate, page, pageSize]);

    // === BATCH PDF GENERATION FUNCTION ===
    const startBatchGeneration = useCallback(async ({ onlyMissing = true } = {}) => {
        if (!emplNo || !role || batchStatus.active) return;

        try {
            console.log(`🔍 Checking for ${onlyMissing ? 'missing' : 'all'} BA links...`);
            let query = supabase
                .from("cctv")
                .select("id,no_spk,lokasi,type,link_ba,status,created_at,teknisi,waktu_problem,waktu_mulai,waktu_selesai,serial_alarm,model_alarm,merk_alarm,st_alarm,sc_alarm,status_alarm,serial_antrian,model_antrian,merk_antrian,sc_antrian,status_antrian,st_antrian,jumlah_channel_dvr,jumlah_kamera,serial_lama,kapasitas_lama,sisa_lama,st_lama,serial_baru,kapasitas_baru,sisa_baru,st_baru,mulai_record,selesai_record,waktu_record,firmware_dvr,catatan_pelanggan,row_tiga,serial_tiga,model_tiga,merk_tiga,st_tiga,sc_tiga,status_tiga,row_empat,serial_empat,model_empat,merk_empat,st_empat,sc_empat,status_empat,pelanggan,tanda_tangan,tanda_tangan1,tanda_tangan2")
                .in("status", ["CLOSE", "PENDING"])
                .order("created_at", { ascending: false });

            if (onlyMissing) {
                query = query.or("link_ba.is.null,link_ba.eq.,link_ba.eq.'',link_ba.eq.'-'");
            }

            if (role?.toLowerCase() !== "superadmin") {
                query = query.contains("assigned_to", [emplNo]);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                console.log(`🚀 Starting batch generation for ${data.length} orders...`);
                setBatchStatus({ active: true, current: 0, total: data.length, currentSPK: "", errors: [] });

                for (let i = 0; i < data.length; i++) {
                    const order = data[i];
                    setBatchStatus(prev => ({ ...prev, current: i + 1, currentSPK: order.no_spk }));

                    console.log(`Generating BA (${i + 1}/${data.length}): ${order.no_spk}`);
                    const result = await generateBA(order);

                    if (!result.ok) {
                        console.error(`❌ Failed to generate BA for ${order.no_spk}:`, result.error);
                        setBatchStatus(prev => ({
                            ...prev,
                            errors: [...prev.errors, { spk: order.no_spk, error: result.error?.message || "Unknown error" }]
                        }));
                    }

                    // Refresh periodically
                    if ((i + 1) % 5 === 0 || i === data.length - 1) {
                        fetchOrders(page, pageSize);
                    }

                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                console.log("✅ Batch generation process finished.");
                setTimeout(() => {
                    setBatchStatus(prev => ({ ...prev, active: false }));
                }, 2000);
            } else {
                console.log("✅ No matching orders found for generation.");
                if (!onlyMissing) {
                    alert("Tidak ada data yang perlu digenerate.");
                }
            }
        } catch (err) {
            console.error("Batch generation error:", err);
            setBatchStatus(prev => ({ ...prev, active: false }));
        }
    }, [emplNo, role, batchStatus.active, fetchOrders, page, pageSize]);

    // Trigger auto-batch only on mount/login (once)
    useEffect(() => {
        if (emplNo && role) {
            startBatchGeneration({ onlyMissing: true });
        }
    }, [emplNo, role]);

    // fetch profile once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabase.from("users").select("empl_no, role").eq("email", user.email).single();
                if (!mounted) return;
                setEmplNo(profile?.empl_no ?? null);
                setRole(profile?.role ?? null);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => (mounted = false);
    }, []);

    // trigger fetch when params change
    useEffect(() => {
        if (!fromDate || !toDate) return;
        fetchOrders(page, pageSize);
    }, [fromDate, toDate, page, pageSize, emplNo, role, fetchOrders]);

    const onPageChange = (p) => {
        if (p < 1 || p > totalPages) return;
        setPage(p);
    };

    const onChangePageSize = (newSize) => {
        setPageSize(newSize);
        setPage(1);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(orders);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "CloseOrders");
        XLSX.writeFile(workbook, "close_orders.xlsx");
    };

    // Refresh button (will not generate BA to avoid long blocking)
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOrders(1, pageSize);
        setPage(1);
        setRefreshing(false);
    };

    const filtered = orders.filter((o) => (o.lokasi || "").toLowerCase().includes(search.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => (sortAsc ? (a.lokasi || "").localeCompare(b.lokasi || "") : (b.lokasi || "").localeCompare(a.lokasi || "")));

    return (
        <div className="p-6 relative">
            <img src="/logo.png" alt="Logo" className="absolute top-4 left-4 w-20 h-auto" />

            <h1 className="text-2xl font-bold mb-6 text-center">Close / Pending Orders</h1>

            <WorkOrderFilters
                search={search}
                setSearch={setSearch}
                fromDate={fromDate}
                setFromDate={setFromDate}
                toDate={toDate}
                setToDate={setToDate}
                sortAsc={sortAsc}
                toggleSort={() => setSortAsc((s) => !s)}
                exportToExcel={exportToExcel}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                extraButtons={
                    <button
                        onClick={() => startBatchGeneration({ onlyMissing: false })}
                        disabled={batchStatus.active}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        Generate All PDFs
                    </button>
                }
            />

            {batchStatus.active && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                            <div>
                                <p className="text-sm font-semibold text-orange-800">Mengecek & Mengisi Link BA Otomatis...</p>
                                <p className="text-xs text-orange-600">
                                    Sedang memproses {batchStatus.currentSPK} ({batchStatus.current}/{batchStatus.total})
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-orange-600">{Math.round((batchStatus.current / batchStatus.total) * 100)}%</span>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-600 transition-all duration-300"
                            style={{ width: `${(batchStatus.current / batchStatus.total) * 100}%` }}
                        />
                    </div>
                    {batchStatus.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border-t border-red-100 rounded text-xs text-red-600">
                            <p className="font-semibold mb-1">Gagal generate ({batchStatus.errors.length}):</p>
                            <ul className="list-disc ml-4 max-h-20 overflow-y-auto">
                                {batchStatus.errors.map((err, idx) => (
                                    <li key={idx}>{err.spk}: {err.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <WorkOrderTable orders={sorted} loading={loading} page={page} totalPages={totalPages} onPageChange={onPageChange} />

            <div className="mt-4 flex items-center justify-end gap-3">
                <label className="text-sm text-gray-600">Per page:</label>
                <select value={pageSize} onChange={(e) => onChangePageSize(Number(e.target.value))} className="px-3 py-1 border rounded">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>
        </div>
    );
}
