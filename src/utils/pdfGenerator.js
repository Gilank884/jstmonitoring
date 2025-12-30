import { supabase } from "../supabaseClient";
import { jsPDF } from "jspdf";

const logoCache = { base64: null, timestamp: 0 };

async function getLogoBase64() {
    if (logoCache.base64) return logoCache.base64;
    try {
        const res = await fetch("/logo.png");
        if (!res.ok) return null;
        const blob = await res.blob();
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
        logoCache.base64 = base64;
        return base64;
    } catch (err) {
        console.warn("Gagal load logo:", err);
        return null;
    }
}

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

// BATCH FETCH HELPER
async function fetchAllPhotos(order, chosenPrefix) {
    const promises = [];
    for (let i = 1; i <= 8; i++) {
        const path = `${chosenPrefix}/foto${i}.jpg`;
        // Push a promise that resolves to { idx: i, base64: ... }
        promises.push(
            fetchImageAsBase64(path).then(base64 => ({ idx: i, base64 }))
        );
    }
    return Promise.all(promises);
}

/**
 * generateBA(order)
 * - Generates FULL BA PDF with watermark, header, equipment table, signatures, photos
 * - Optimized for speed: Parallel fetching, caching, client-side blob generation.
 * - Returns { ok: boolean, url?: string, error?: any }
 */
export async function generateBA(order) {
    try {
        const logoBase64Promise = getLogoBase64();
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        // 1. Detect Prefix
        let chosenPrefix = `${order.no_spk}`;
        try {
            const { data: list1 } = await supabase.storage.from("workorder").list(chosenPrefix);
            if (!list1 || list1.length === 0) {
                const altPrefix = `workorder/${order.no_spk}`;
                const { data: list2 } = await supabase.storage.from("workorder").list(altPrefix);
                if (list2 && list2.length > 0) chosenPrefix = altPrefix;
            }
        } catch (e) { /* silent fail */ }

        // 2. Start Fetching Photos and Signatures in PARALLEL
        const photosPromise = fetchAllPhotos(order, chosenPrefix);

        const getSignatureParallel = async (type) => {
            const candidates = type === "jagarti"
                ? [`${chosenPrefix}/tanda1.png`, `${chosenPrefix}/tanda_tangan1.png`, `${chosenPrefix}/tangan.png`, `${chosenPrefix}/tanda1.jpg`]
                : [`${chosenPrefix}/tanda2.png`, `${chosenPrefix}/tanda_tangan2.png`, `${chosenPrefix}/tanda2.jpg`];

            for (const path of candidates) {
                const base64 = await fetchImageAsBase64(path);
                if (base64) return base64;
            }

            // Fallback to DB Fields
            const dbField = type === "jagarti" ? (order.tanda_tangan1 || order.tanda_tangan) : order.tanda_tangan2;
            if (dbField) {
                try {
                    const res = await fetch(dbField);
                    if (res.ok) {
                        const blob = await res.blob();
                        return await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (e) { }
            }
            return null;
        };

        const jagartiSigPromise = getSignatureParallel("jagarti");
        const customerSigPromise = getSignatureParallel("customer");

        // Await Logo locally just before use (it might already be cached or fetching)
        const logoBase64 = await logoBase64Promise;

        // ===== WATERMARK BESAR (TENGAH) =====
        if (logoBase64) {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));

            const pageW = 297;
            const pageH = 210;
            const logoW = 200;
            const logoH = 200 * (1 / 1.5);
            const logoX = (pageW - logoW) / 2;
            const logoY = (pageH - logoH) / 2;

            try {
                doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
            } catch (err) {
                console.warn("❌ Gagal watermark:", err);
            }

            doc.restoreGraphicsState();
        }

        // ===== HEADER =====
        if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 30, 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", 45, 16);
        doc.setFontSize(35);
        doc.text("LAPORAN KERJA", 210, 23, { align: "right" });

        // ===== MAIN BOX =====
        const marginX = 5;
        let cursorY = 30;
        doc.setLineWidth(0.5);
        doc.rect(marginX, cursorY, 298 - marginX * 2, 178);

        // ===== INFO HEADER =====
        const infoY = cursorY + 4;
        doc.setFontSize(10);

        doc.text(`No SPK: ${order.no_spk || "-"}`, marginX + 4, infoY + 6);
        doc.text(
            `Tanggal Problem: ${order.waktu_problem ? new Date(order.waktu_problem).toLocaleDateString() : "-"}`,
            marginX + 4,
            infoY + 12
        );
        doc.text(`Lokasi: ${order.lokasi || "-"}`, marginX + 4, infoY + 18);
        doc.text(`Dilaporkan Oleh: ${order.teknisi || "-"}`, marginX + 4, infoY + 24);

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

        // ===== URAIAN PEKERJAAN =====
        const pmY = tableY + 6;
        const pmX = marginX + 2;

        doc.setFont("helvetica", "bold");
        doc.text("URAIAN PEKERJAAN:", pmX + 4, pmY);
        doc.setFont("helvetica", "normal");

        const pmTextStartY = pmY + 6;
        const masalah =
            `Backup Data / Cek Data CCTV (${order.lokasi || "-"})\nJumlah Channel DVR: ${order.jumlah_channel_dvr || "-"}\nJumlah Kamera: ${order.jumlah_kamera || "-"}`;

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
        const penyelesaian = "Backup HDD Lama / Baru";
        const lineHeight = 6;
        const totalLines = 7;
        const penyBoxHeight = totalLines * lineHeight;
        doc.rect(penyX, penyY - 6, 278, penyBoxHeight);
        doc.text(penyelesaian, penyX + 6, penyTextStartY);

        // ===== KOLOM HDD =====
        const colLamaX = penyX + 6;
        const colBaruX = penyX + 95;
        const colHistoryX = penyX + 185;

        const dataPairs = [
            { left: `SN HDD Lama : ${order.serial_lama || "-"}`, right: `SN HDD Baru : ${order.serial_baru || "-"}` },
            { left: `Kapasitas   : ${order.kapasitas_lama || "-"}`, right: `Kapasitas   : ${order.kapasitas_baru || "-"}` },
            { left: `Sisa        : ${order.sisa_lama || "-"}`, right: `Sisa        : ${order.sisa_baru || "-"}` },
            { left: `ST          : ${order.st_lama || "-"}`, right: `ST          : ${order.st_baru || "-"}` },
        ];

        doc.setFont("helvetica", "bold");
        doc.text("History Backup Data:", colHistoryX, penyTextStartY + lineHeight - 8);
        doc.setFont("helvetica", "normal");

        const historyPairs = [
            { left: `Mulai Tanggal   : ${order.mulai_record || "-"}` },
            { left: `Sampai Tanggal  : ${order.selesai_record || "-"}` },
            { left: `Tanggal Record  : ${order.waktu_record || "-"}` },
            { left: `Firmware DVR    : ${order.firmware_dvr || "-"}` },
        ];

        const maxRows = Math.max(dataPairs.length, historyPairs.length);
        for (let i = 0; i < maxRows; i++) {
            const y = penyTextStartY + (i + 0.8) * lineHeight;
            if (dataPairs[i]?.left) doc.text(dataPairs[i].left, colLamaX, y);
            if (dataPairs[i]?.right) doc.text(dataPairs[i].right, colBaruX, y);
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

        // ===== TANDA TANGAN (Robust Detection) =====
        const signH = 23;
        const totalWidth = noteWidth;
        const signGap = 0;
        const signW = (totalWidth - signGap) / 2;
        const signY = noteY + noteHeight - 6;

        const signLeftX = penyX;
        const signRightX = signLeftX + signW + signGap;

        // --- WAIT FOR SIGNATURES HERE ---
        const [jagartiBase64, customerBase64] = await Promise.all([jagartiSigPromise, customerSigPromise]);


        // --- Kotak Pelanggan ---
        doc.rect(signLeftX, signY, signW, signH);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Mengetahui Pelanggan", signLeftX + 1, signY + 3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`Nama Pelanggan: ${order.pelanggan || "-"}`, signLeftX + 1, signY + signH - 1);

        if (customerBase64) {
            try {
                const img = new Image();
                img.src = customerBase64;
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
                const imgX = signLeftX + (signW - imgWidth) / 2;
                const imgY = signY + (signH - imgHeight) / 2;
                doc.addImage(customerBase64, "PNG", imgX, imgY, imgWidth, imgHeight);
            } catch (e) {
                console.warn("❌ Gagal render ttd pelanggan:", e);
            }
        }

        // --- Kotak PT JAGARTI ---
        doc.rect(signRightX, signY, signW, signH);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", signRightX + 1, signY + 3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`Nama Teknisi: ${order.teknisi || "-"}`, signRightX + 1, signY + signH - 1);

        if (jagartiBase64) {
            try {
                const img = new Image();
                img.src = jagartiBase64;
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
                doc.addImage(jagartiBase64, "PNG", imgX, imgY, imgWidth, imgHeight);
            } catch (e) {
                console.warn("❌ Gagal render ttd JAGARTI:", e);
            }
        }

        // ===== HALAMAN FOTO (2-3) =====

        // --- WAIT FOR PHOTOS HERE ---
        // result is array of { idx, base64 } or failed items
        const rawPhotos = await photosPromise;
        const photosMap = {};
        rawPhotos.forEach(p => {
            if (p && p.base64) photosMap[p.idx] = p.base64;
        });

        for (let page = 2; page <= 3; page++) {
            doc.addPage({ orientation: "landscape", unit: "mm", format: "a4" });

            if (logoBase64) doc.addImage(logoBase64, "PNG", 15, 2, 25, 20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text("PT. JAGARTI SARANA TELEKOMUNIKASI", 45, 16);
            doc.setFontSize(35);
            doc.text("LAPORAN KERJA", 210, 23, { align: "right" });

            // FOTO 2x2
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

                const base64 = photosMap[i];

                doc.setDrawColor(0);
                doc.rect(imgX, imgY + 4, imgW, imgH);

                if (base64) {
                    try {
                        doc.addImage(base64, "JPEG", imgX, imgY + 4, imgW, imgH);
                    } catch {
                        doc.setFillColor(230, 230, 230);
                        doc.rect(imgX, imgY + 4, imgW, imgH, "F");
                        doc.rect(imgX, imgY + 4, imgW, imgH);
                    }
                } else {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX, imgY + 4, imgW, imgH, "F");
                    doc.rect(imgX, imgY + 4, imgW, imgH);
                }

                if (i % 2 === 1) {
                    imgX = imgStartX + imgW + 15;
                } else {
                    imgX = imgStartX;
                    imgY += imgH + 25;
                }
            }
        }

        // ===== DISPLAY ON-DEMAND (NO UPLOAD) =====
        const pdfBlob = doc.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);

        return { ok: true, url: blobUrl };

    } catch (err) {
        console.error("generateBA error:", err);
        return { ok: false, error: err };
    }
}

export default generateBA;