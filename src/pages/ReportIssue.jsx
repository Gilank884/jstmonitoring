import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { supabase } from "../supabaseClient";

export default function IssueForm() {
    const containerRef = useRef(null);
    const modalRef = useRef(null);
    const backdropRef = useRef(null);

    const [form, setForm] = useState({
        title: "",
        category: "",
        priority: "",
        description: "",
        kc_name: "",
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        gsap.from(containerRef.current, {
            opacity: 0,
            y: 30,
            duration: 0.6,
            ease: "power3.out",
        });
    }, []);

    // Modal animation
    const showModal = () => {
        setModalOpen(true);

        gsap.fromTo(
            backdropRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" }
        );

        gsap.fromTo(
            modalRef.current,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );
    };

    const closeModal = () => {
        gsap.to(modalRef.current, {
            opacity: 0,
            scale: 0.8,
            duration: 0.3,
            ease: "power3.in",
        });

        gsap.to(backdropRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => setModalOpen(false),
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const userAgent = window.navigator.userAgent;

        const { error } = await supabase.from("issue").insert([
            {
                ...form,
                user_agent: userAgent,
                status: "open",
            },
        ]);

        setLoading(false);

        if (error) {
            setErrorMsg(error.message || "Terjadi kesalahan");

            gsap.fromTo(
                ".error-box",
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 0.4 }
            );

            setTimeout(() => setErrorMsg(""), 3500);
            return;
        }

        // Show modal
        showModal();

        setForm({
            title: "",
            category: "",
            priority: "",
            description: "",
            kc_name: "",
        });
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen flex justify-center items-center bg-white py-16 px-4"
        >
            <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-100">

                <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
                    Report Issue
                </h1>

                {errorMsg && (
                    <div className="error-box bg-red-100 text-red-700 py-3 px-4 rounded-lg mb-4 text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title */}
                    <div>
                        <label className="text-gray-600 font-medium">Title</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-gray-600 font-medium">Category</label>
                        <select
                            className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category</option>
                            <option value="Bug">Bug</option>
                            <option value="Request">Request</option>
                            <option value="Improvement">Improvement</option>
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-gray-600 font-medium">Priority</label>
                        <select
                            className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={form.priority}
                            onChange={(e) => setForm({ ...form, priority: e.target.value })}
                            required
                        >
                            <option value="">Select Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>

                    {/* KC Name */}
                    <div>
                        <label className="text-gray-600 font-medium">KC Name</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={form.kc_name}
                            onChange={(e) => setForm({ ...form, kc_name: e.target.value })}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-gray-600 font-medium">Description</label>
                        <textarea
                            className="w-full border rounded-lg px-4 py-2 mt-1 h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            required
                        ></textarea>
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 ${loading
                            ? "bg-gray-400"
                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                            } btn-send`}
                        onMouseEnter={() => gsap.to(".btn-send", { scale: 1.04, duration: 0.2 })}
                        onMouseLeave={() => gsap.to(".btn-send", { scale: 1, duration: 0.2 })}
                    >
                        {loading ? "Sending..." : "Submit Issue"}
                    </button>
                </form>
            </div>

            {/* MODAL POPUP */}
            {modalOpen && (
                <>
                    <div
                        ref={backdropRef}
                        className="fixed inset-0 bg-white/40 backdrop-blur-sm"

                    ></div>

                    <div
                        ref={modalRef}
                        className="fixed inset-0 flex justify-center items-center px-4"
                    >
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-7 text-center border">
                            <h2 className="text-xl font-semibold text-gray-800 mb-3">
                                Terima Kasih!
                            </h2>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Aduan Anda telah berhasil kami terima.
                                Tim kami akan memproses dan menindaklanjutinya sesegera mungkin.
                                Terima kasih atas partisipasi Anda dalam membantu peningkatan layanan.
                            </p>

                            <button
                                onClick={closeModal}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
