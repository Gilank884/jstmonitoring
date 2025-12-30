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
                .select("*", { count: "exact" })
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
        const dataToExport = orders.map(o => ({
            ...o,
            link_ba: `https://jstmonitoring.netlify.app/.netlify/functions/file?path=ba/${o.no_spk}.pdf`
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
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

            />



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
