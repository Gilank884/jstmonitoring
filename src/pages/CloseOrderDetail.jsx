import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import generateBA from "../utils/pdfGenerator";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

export default function CloseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photos, setPhotos] = useState([]);
    const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
    const [signatures, setSignatures] = useState({ customer: null, jagarti: null });
    const carouselRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from("cctv").select("*").eq("id", id).single();
                if (error) throw error;
                if (mounted) {
                    setOrder(data);
                    await loadPhotosAndSignatures(data);
                    // Auto-generate BA on page load
                    await generateBA(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => (mounted = false);
    }, [id]);

    const loadPhotosAndSignatures = async (orderData) => {
        try {
            // Detect storage prefix (some uploads used an extra `workorder/` prefix).
            let prefixCandidate1 = `${orderData.no_spk}`;
            let prefixCandidate2 = `workorder/${orderData.no_spk}`;
            let chosenPrefix = prefixCandidate1;

            try {
                const { data: list1, error: listErr1 } = await supabase.storage.from("workorder").list(prefixCandidate1);
                if (listErr1) console.debug("list prefix1 error:", listErr1);
                if (Array.isArray(list1) && list1.length > 0) chosenPrefix = prefixCandidate1;
                else {
                    const { data: list2, error: listErr2 } = await supabase.storage.from("workorder").list(prefixCandidate2);
                    if (listErr2) console.debug("list prefix2 error:", listErr2);
                    if (Array.isArray(list2) && list2.length > 0) chosenPrefix = prefixCandidate2;
                }
            } catch (e) {
                console.debug("Error detecting storage prefix:", e);
            }

            console.log(`Menggunakan prefix storage: ${chosenPrefix}`);

            const photoUrls = [];
            for (let i = 1; i <= 8; i++) {
                const path = `${chosenPrefix}/foto${i}.jpg`;
                const { data: publicUrl } = supabase.storage.from("workorder").getPublicUrl(path);
                const url = publicUrl?.publicUrl;
                if (url) photoUrls.push({ idx: i, url });
            }

            if (photoUrls.length === 0) {
                console.log(`Foto belum ada untuk ${orderData.no_spk}`);
            } else {
                console.log(`Ditemukan ${photoUrls.length} foto untuk ${orderData.no_spk}`);
            }
            setPhotos(photoUrls);

            // Load signatures using the chosenPrefix and fallback to DB fields if present
            const sigCandidates = [
                `${chosenPrefix}/tanda1.png`,
                `${chosenPrefix}/tanda2.png`,
                `${chosenPrefix}/tanda_tangan1.png`,
                `${chosenPrefix}/tanda_tangan2.png`,
                `${chosenPrefix}/tanda1.jpg`,
                `${chosenPrefix}/tanda2.jpg`,
            ];

            let jagartiUrl = null;
            let customerUrl = null;

            try {
                for (const p of sigCandidates) {
                    if (!jagartiUrl && (p.toLowerCase().includes('tanda1') || p.toLowerCase().includes('tanda_tangan1'))) {
                        const { data } = supabase.storage.from('workorder').getPublicUrl(p);
                        if (data?.publicUrl) {
                            jagartiUrl = data.publicUrl;
                            console.log(`Found jagarti signature at ${p}`);
                        }
                    }
                    if (!customerUrl && (p.toLowerCase().includes('tanda2') || p.toLowerCase().includes('tanda_tangan2'))) {
                        const { data } = supabase.storage.from('workorder').getPublicUrl(p);
                        if (data?.publicUrl) {
                            customerUrl = data.publicUrl;
                            console.log(`Found customer signature at ${p}`);
                        }
                    }
                    if (jagartiUrl && customerUrl) break;
                }
            } catch (e) {
                console.debug('Error while checking signature files:', e);
            }

            if (!jagartiUrl && orderData.tanda_tangan1) {
                jagartiUrl = orderData.tanda_tangan1;
                console.log('Using jagarti signature from DB field tanda_tangan1');
            }
            if (!jagartiUrl && orderData.tanda_tangan) {
                jagartiUrl = orderData.tanda_tangan;
                console.log('Using jagarti signature from DB field tanda_tangan');
            }

            if (!customerUrl && orderData.tanda_tangan2) {
                customerUrl = orderData.tanda_tangan2;
                console.log('Using customer signature from DB field tanda_tangan2');
            }

            setSignatures({ jagarti: jagartiUrl, customer: customerUrl });
        } catch (err) {
            console.error("Error loading photos/signatures:", err);
        }
    };

    const handleNextPhoto = () => {
        if (photos.length === 0) return;
        const nextIdx = (currentPhotoIdx + 1) % photos.length;
        animateCarousel(nextIdx);
    };

    const handlePrevPhoto = () => {
        if (photos.length === 0) return;
        const prevIdx = (currentPhotoIdx - 1 + photos.length) % photos.length;
        animateCarousel(prevIdx);
    };

    const animateCarousel = (nextIdx) => {
        gsap.to(carouselRef.current, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                setCurrentPhotoIdx(nextIdx);
                gsap.to(carouselRef.current, {
                    opacity: 1,
                    duration: 0.3,
                });
            },
        });
    };



    if (loading) return <div className="p-6 text-center">Loading...</div>;
    if (!order) return <div className="p-6 text-center">Order tidak ditemukan</div>;

    const currentPhoto = photos[currentPhotoIdx];
    const statusBadgeClass = order.status && (order.status.toLowerCase().includes("close") ? "bg-amber-100 text-amber-800" : order.status.toLowerCase().includes("open") ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-800");
    const photoCount = photos.length;
    const sigCount = (signatures.customer ? 1 : 0) + (signatures.jagarti ? 1 : 0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <button onClick={() => navigate(-1)} className="mb-4 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">← Back</button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left / Main */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-amber-600 mb-1">{order.no_spk}</h1>
                                <p className="text-sm text-gray-600">{order.lokasi || "-"} • {order.pelanggan || "-"}</p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass}`}>
                                    {order.status}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Tipe: {order.type || "-"}</p>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600 font-semibold">Teknisi</p>
                                <p className="text-gray-900">{order.teknisi || "-"}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-semibold">No. Telp</p>
                                <p className="text-gray-900">{order.no_telp || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-bold mb-3">Tanggal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600 font-semibold">Problem</p>
                                <p className="text-gray-900">{order.waktu_problem ? new Date(order.waktu_problem).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-semibold">Mulai</p>
                                <p className="text-gray-900">{order.waktu_mulai || "-"}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-semibold">Selesai</p>
                                <p className="text-gray-900">{order.waktu_selesai || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
                        <h3 className="text-lg font-bold mb-3">Equipment</h3>
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border p-2 text-left">No</th>
                                    <th className="border p-2 text-left">Type Mesin</th>
                                    <th className="border p-2 text-left">Serial Number</th>
                                    <th className="border p-2 text-left">Model</th>
                                    <th className="border p-2 text-left">Merk</th>
                                    <th className="border p-2 text-left">ST</th>
                                    <th className="border p-2 text-left">SC</th>
                                    <th className="border p-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="odd:bg-white even:bg-gray-50">
                                    <td className="border p-2">1</td>
                                    <td className="border p-2">Alarm</td>
                                    <td className="border p-2">{order.serial_alarm || "-"}</td>
                                    <td className="border p-2">{order.model_alarm || "-"}</td>
                                    <td className="border p-2">{order.merk_alarm || "-"}</td>
                                    <td className="border p-2">{order.st_alarm || "-"}</td>
                                    <td className="border p-2">{order.sc_alarm || "-"}</td>
                                    <td className="border p-2">{order.status_alarm || "-"}</td>
                                </tr>
                                <tr className="odd:bg-white even:bg-gray-50">
                                    <td className="border p-2">2</td>
                                    <td className="border p-2">Antrian</td>
                                    <td className="border p-2">{order.serial_antrian || "-"}</td>
                                    <td className="border p-2">{order.model_antrian || "-"}</td>
                                    <td className="border p-2">{order.merk_antrian || "-"}</td>
                                    <td className="border p-2">{order.st_antrian || "-"}</td>
                                    <td className="border p-2">{order.sc_antrian || "-"}</td>
                                    <td className="border p-2">{order.status_antrian || "-"}</td>
                                </tr>
                                <tr className="odd:bg-white even:bg-gray-50">
                                    <td className="border p-2">3</td>
                                    <td className="border p-2">{order.row_tiga || "-"}</td>
                                    <td className="border p-2">{order.serial_tiga || "-"}</td>
                                    <td className="border p-2">{order.model_tiga || "-"}</td>
                                    <td className="border p-2">{order.merk_tiga || "-"}</td>
                                    <td className="border p-2">{order.st_tiga || "-"}</td>
                                    <td className="border p-2">{order.sc_tiga || "-"}</td>
                                    <td className="border p-2">{order.status_tiga || "-"}</td>
                                </tr>
                                <tr className="odd:bg-white even:bg-gray-50">
                                    <td className="border p-2">4</td>
                                    <td className="border p-2">{order.row_empat || "-"}</td>
                                    <td className="border p-2">{order.serial_empat || "-"}</td>
                                    <td className="border p-2">{order.model_empat || "-"}</td>
                                    <td className="border p-2">{order.merk_empat || "-"}</td>
                                    <td className="border p-2">{order.st_empat || "-"}</td>
                                    <td className="border p-2">{order.sc_empat || "-"}</td>
                                    <td className="border p-2">{order.status_empat || "-"}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-bold mb-3">HDD Lama</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-gray-600">Serial:</span> {order.serial_lama || "-"}</p>
                                <p><span className="text-gray-600">Kapasitas:</span> {order.kapasitas_lama || "-"}</p>
                                <p><span className="text-gray-600">Sisa:</span> {order.sisa_lama || "-"}</p>
                                <p><span className="text-gray-600">ST:</span> {order.st_lama || "-"}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-bold mb-3">HDD Baru</h3>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-gray-600">Serial:</span> {order.serial_baru || "-"}</p>
                                <p><span className="text-gray-600">Kapasitas:</span> {order.kapasitas_baru || "-"}</p>
                                <p><span className="text-gray-600">Sisa:</span> {order.sisa_baru || "-"}</p>
                                <p><span className="text-gray-600">ST:</span> {order.st_baru || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-bold mb-3">History Backup Data</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-amber-600 rounded-full mt-2" />
                                <div>
                                    <p className="text-gray-600 font-semibold">Mulai Tanggal</p>
                                    <p className="text-gray-900">{order.mulai_record || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-amber-600 rounded-full mt-2" />
                                <div>
                                    <p className="text-gray-600 font-semibold">Sampai Tanggal</p>
                                    <p className="text-gray-900">{order.selesai_record || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-amber-600 rounded-full mt-2" />
                                <div>
                                    <p className="text-gray-600 font-semibold">Firmware DVR</p>
                                    <p className="text-gray-900">{order.firmware_dvr || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-bold mb-2">Catatan Pelanggan</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{order.catatan_pelanggan || "-"}</p>
                    </div>

                    {/* Photo Carousel or placeholder message */}
                    {photos.length > 0 ? (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-bold mb-4">Foto ({currentPhotoIdx + 1}/{photos.length})</h3>
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
                                <img
                                    ref={carouselRef}
                                    src={currentPhoto?.url}
                                    alt={`Foto ${currentPhoto?.idx || '-'}`}
                                    className="w-full h-full object-contain"
                                    onLoad={() => console.log(`Foto ditampilkan: idx=${currentPhoto?.idx} url=${currentPhoto?.url}`)}
                                    onError={() => console.log(`Gagal memuat foto: idx=${currentPhoto?.idx} url=${currentPhoto?.url}`)}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <button onClick={handlePrevPhoto} className="p-2 bg-gray-300 hover:bg-gray-400 rounded-lg"><ChevronLeft size={20} /></button>
                                <span className="text-sm text-gray-600">Foto {currentPhoto.idx}</span>
                                <button onClick={handleNextPhoto} className="p-2 bg-gray-300 hover:bg-gray-400 rounded-lg"><ChevronRight size={20} /></button>
                            </div>

                            {/* Thumbnails */}
                            {photos.length > 1 && (
                                <div className="flex gap-2 mt-4 overflow-x-auto">
                                    {photos.map((p, idx) => (
                                        <button key={p.idx} onClick={() => animateCarousel(idx)} className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border ${idx === currentPhotoIdx ? 'ring-2 ring-amber-400' : ''}`}>
                                            <img src={p.url} alt={`thumb-${p.idx}`} className="w-full h-full object-cover" onLoad={() => console.log(`Thumb ditampilkan: idx=${p.idx} url=${p.url}`)} onError={() => console.log(`Gagal memuat thumb: idx=${p.idx} url=${p.url}`)} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">Foto belum ada</div>
                    )}

                    {/* Signatures */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-bold mb-3">Tanda Tangan Pelanggan</h3>
                            <p className="text-sm text-gray-600 mb-2">Nama: {order.pelanggan || "-"}</p>
                            {signatures.customer ? (
                                <img src={signatures.customer} alt="Customer Signature" className="w-full h-20 object-contain border rounded" />
                            ) : (
                                <div className="text-sm text-gray-500">Tanda tangan belum ada</div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-bold mb-3">Tanda Tangan PT. JAGARTI</h3>
                            <p className="text-sm text-gray-600 mb-2">Teknisi: {order.teknisi || "-"}</p>
                            {signatures.jagarti ? (
                                <img src={signatures.jagarti} alt="JAGARTI Signature" className="w-full h-20 object-contain border rounded" />
                            ) : (
                                <div className="text-sm text-gray-500">Tanda tangan belum ada</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right / Sidebar */}
                <aside className="space-y-4">
                    <div className="bg-white rounded-lg shadow p-4 sticky top-6">
                        <p className="text-xs text-gray-500">Summary</p>
                        <h4 className="text-lg font-bold mt-2">Ringkasan</h4>
                        <div className="mt-3 text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-semibold">{order.status}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Photos</span><span className="font-semibold">{photoCount}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Tanda Tangan</span><span className="font-semibold">{sigCount}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Type</span><span className="font-semibold">{order.type || '-'}</span></div>
                        </div>

                        {order.link_ba && (
                            <a href={order.link_ba} target="_blank" rel="noreferrer" className="mt-4 block text-center px-4 py-2 bg-green-600 text-white rounded">Download BA</a>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Teknisi</p>
                        <p className="font-semibold">{order.teknisi || '-'}</p>
                        <p className="text-sm text-gray-500 mt-2">Lokasi</p>
                        <p className="font-semibold">{order.lokasi || '-'}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}