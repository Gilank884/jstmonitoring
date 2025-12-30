import React from "react";
import { Search, SortAsc, SortDesc, RefreshCcw } from "lucide-react";

export default function WorkOrderFilters({
    search,
    setSearch,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    sortAsc,
    toggleSort,
    exportToExcel,
    onRefresh,
    refreshing,
    extraButtons,
}) {
    return (
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

                <button onClick={toggleSort} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                    {sortAsc ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                    Sort
                </button>

                <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">
                    Export Excel
                </button>

                {/* Optional extra buttons passed from parent */}
                {extraButtons}

                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition disabled:opacity-50"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>
        </div>
    );
}
