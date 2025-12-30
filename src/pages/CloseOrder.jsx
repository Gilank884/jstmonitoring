import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Search, SortAsc, SortDesc, RefreshCcw, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { generateBA } from "../utils/pdfGenerator";

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
            "id,no_spk,lokasi,type,link_ba,status,created_at,teknisi,waktu_problem,waktu_mulai,waktu_selesai,serial_alarm,model_alarm,merk_alarm,st_alarm,sc_alarm,status_alarm,serial_antrian,model_antrian,merk_antrian,sc_antrian,status_antrian,st_antrian,jumlah_channel_dvr,jumlah_kamera,serial_lama,kapasitas_lama,sisa_lama,st_lama,serial_baru,kapasitas_baru,sisa_baru,st_baru,mulai_record,selesai_record,waktu_record,firmware_dvr,catatan_pelanggan,row_tiga,serial_tiga,model_tiga,merk_tiga,st_tiga,sc_tiga,status_tiga,row_empat,serial_empat,model_empat,merk_empat,st_empat,sc_empat,status_empat,pelanggan,permasalahan,penyelesaian,tanda_tangan,tanda_tangan1,tanda_tangan2",
            { count: "exact" }
          )
          .in("status", ["CLOSE", "PENDING"])
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

        console.log("📦 Data fetched:", data);
        setOrders(data || []);
        setTotalCount(count ?? 0);
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
    const dataToExport = sortedOrders.map(o => ({
      ...o,
      link_ba: `https://jstmonitoring.netlify.app/closeorder/${o.id}`
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
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
                      <button
                        onClick={async () => {
                          try {
                            const res = await generateBA(o);
                            if (res.ok && res.url) window.open(res.url, "_blank");
                            else alert("Gagal preview BA");
                          } catch (e) { console.error(e); }
                        }}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        Preview BA
                      </button>
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


