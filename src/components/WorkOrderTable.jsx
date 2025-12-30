import React from "react";
import { Link } from "react-router-dom";
import { generateBA } from "../utils/pdfGenerator";

export function getTypeBadge(type) {
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
}

export function getStatusBadge(status) {
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
}

export default function WorkOrderTable({ orders, loading, page, totalPages, onPageChange }) {
    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow relative">
            {loading && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
                    <p className="text-gray-700 font-semibold">Memuat data...</p>
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
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="text-center py-6 text-gray-500">
                                Tidak ada data
                            </td>
                        </tr>
                    ) : (
                        orders.map((o, i) => (
                            <tr key={o.id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-3 border-t">{o.no_spk}</td>
                                <td className="px-4 py-3 border-t">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
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
                                <td className="px-4 py-3 border-t">
                                    <div className="flex items-center gap-2">
                                        <Link to={`/workorder/${o.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded">Detail</Link>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* PAGINATION CONTROL */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 p-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50">Previous</button>
                    <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50">Next</button>
                </div>

                <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            </div>
        </div>
    );
}
