"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Send, MapPin, Loader2, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [profile, setProfile] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const pollingRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Load profil login
  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      const { data: profileData } = await supabase
        .from("users")
        .select("empl_no, role, empl_name")
        .eq("email", data.user.email)
        .single();
      if (profileData) setProfile(profileData);
    };
    loadProfile();
  }, []);

  // Ambil daftar lokasi saat popup dibuka
  useEffect(() => {
    if (open && profile) fetchLocations();
  }, [open, profile]);

  // ============ SISTEM CHAT REALTIME + POLLING TANPA DUPLIKAT ============
  useEffect(() => {
    if (!open || !activeLocation || !profile) return;

    const me = profile.empl_no;
    const target = activeLocation.to_user;

    // Bersihkan channel lama
    if (channelRef.current?.unsubscribe) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Realtime listener
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.from_user === me && msg.to_user === target) ||
            (msg.from_user === target && msg.to_user === me);
          if (!isRelevant) return;

          setChatHistory((prev) => {
            // Jika pesan sudah ada berdasarkan ID → skip
            if (prev.some((m) => m.id === msg.id)) return prev;

            // Jika pesan lokal punya isi & pengirim sama → ganti ID-nya
            const updated = prev.map((m) =>
              m.fromUser === "me" &&
              m.message === msg.message &&
              String(m.id).startsWith("temp-")
                ? { ...m, id: msg.id }
                : m
            );

            // Kalau sudah diganti ID, jangan tambahkan lagi
            if (updated.some((m) => m.id === msg.id)) return updated;

            // Kalau pesan lawan → tambahkan ke bawah
            return [
              ...updated,
              {
                id: msg.id,
                fromUser: msg.from_user === me ? "me" : "them",
                message: msg.message,
              },
            ];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Polling fallback tiap 1 detik
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("messages")
          .select("id, from_user, to_user, message")
          .or(
            `and(from_user.eq.${me},to_user.eq.${target}),and(from_user.eq.${target},to_user.eq.${me})`
          )
          .order("id", { ascending: true });

        const history = (data || []).map((m) => ({
          id: m.id,
          fromUser: m.from_user === me ? "me" : "them",
          message: m.message,
        }));

        // Gabungkan tanpa duplikat
        setChatHistory((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          history.forEach((msg) => {
            if (!existingIds.has(msg.id)) merged.push(msg);
          });
          return merged;
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1000);

    // Bersihkan saat tutup
    return () => {
      if (channelRef.current?.unsubscribe) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, activeLocation, profile]);

  // --- Ambil lokasi ---
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      let q = supabase.from("cctv").select("lokasi, assigned_to").order("created_at", {
        ascending: false,
      });
      if (profile?.role !== "superadmin") {
        q = q.contains("assigned_to", [profile.empl_no]);
      }
      const { data } = await q;
      const unique = [];
      const seen = new Set();
      (data || []).forEach((d) => {
        if (!d?.lokasi || seen.has(d.lokasi)) return;
        seen.add(d.lokasi);
        unique.push(d);
      });
      setLocations(unique);
    } catch (e) {
      console.error(e);
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  // --- Ambil chat awal ---
  const fetchChatHistory = async (toUser) => {
    if (!profile) return;
    setLoadingChat(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, from_user, to_user, message, created_at")
        .or(
          `and(from_user.eq.${profile.empl_no},to_user.eq.${toUser}),and(from_user.eq.${toUser},to_user.eq.${profile.empl_no})`
        )
        .order("id", { ascending: true });

      const history = (data || []).map((m) => ({
        id: m.id,
        fromUser: m.from_user === profile.empl_no ? "me" : "them",
        message: m.message,
      }));
      setChatHistory(history);
    } catch {
      setChatHistory([]);
    } finally {
      setLoadingChat(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  // --- Klik lokasi ---
  const handleLocationClick = async (loc) => {
    if (!profile) return;
    const assignedList = Array.isArray(loc.assigned_to)
      ? loc.assigned_to
      : loc.assigned_to
      ? [loc.assigned_to]
      : [];
    if (!assignedList.length) return;

    let target = assignedList[0];
    if (target === profile.empl_no && assignedList.length > 1) target = assignedList[1];
    if (target === profile.empl_no) return;

    const { data: userData } = await supabase
      .from("users")
      .select("empl_no, empl_name")
      .eq("empl_no", target)
      .single();

    if (!userData) return;

    setActiveLocation({ ...loc, to_user: userData.empl_no, to_name: userData.empl_name });
    await fetchChatHistory(userData.empl_no);
  };

  // --- Kirim pesan (fix duplikat) ---
  const handleSendMessage = async () => {
    if (!draftMessage.trim() || !profile || !activeLocation?.to_user) return;
    const text = draftMessage.trim();
    setDraftMessage("");

    // Tambahkan pesan lokal dulu
    const tempId = "temp-" + Date.now();
    const optimistic = { id: tempId, fromUser: "me", message: text };
    setChatHistory((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            from_user: profile.empl_no,
            to_user: activeLocation.to_user,
            message: text,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      // Update ID lokal ke ID dari database
      if (data?.id) {
        setChatHistory((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
        );
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { id: "temp-error-" + Date.now(), fromUser: "them", message: "Gagal mengirim pesan" },
      ]);
    }
  };

  // --- Variants animasi ---
  const listVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: (i = 1) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04 } }),
  };

  // --- UI ---
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tombol buka chat */}
      <motion.button
        layout
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03, boxShadow: "0 10px 25px rgba(74,126,147,0.18)" }}
        onClick={() => setOpen((o) => !o)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4a7e93] to-[#1F3361] shadow-lg flex items-center justify-center text-white border border-white/10"
      >
        <Headphones size={26} />
      </motion.button>

      {/* Popup */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-20 right-0 w-80 md:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 h-[520px]"
          >
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-[#4a7e93] to-[#1F3361] text-white font-semibold flex items-center gap-3">
              {activeLocation ? (
                <>
                  <button
                    onClick={() => {
                      setActiveLocation(null);
                      setChatHistory([]);
                    }}
                    className="p-1 rounded-full hover:bg-white/10 transition"
                  >
                    <ArrowLeft size={18} color="white" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{activeLocation.lokasi}</span>
                    <span className="text-xs text-white/80">{activeLocation.to_name}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Headphones size={18} />
                  <span>Chat Teknisi</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 p-3 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
              {!activeLocation ? (
                loadingLocations ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <Loader2 className="animate-spin mr-2" /> Memuat lokasi...
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {locations.map((loc, i) => (
                      <motion.li
                        key={i}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        variants={listVariants}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleLocationClick(loc)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm hover:shadow-md cursor-pointer transition"
                      >
                        <div className="p-2 rounded-lg bg-[#eaf6f7]">
                          <MapPin size={18} className="text-[#4a7e93]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{loc.lokasi}</div>
                          <div className="text-xs text-gray-500">Teknisi tersedia</div>
                        </div>
                        <div className="text-xs text-gray-400">›</div>
                      </motion.li>
                    ))}
                  </ul>
                )
              ) : loadingChat ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <Loader2 className="animate-spin mr-2" /> Memuat chat...
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12 }}
                      className={`max-w-[78%] text-sm break-words ${
                        c.fromUser === "me"
                          ? "ml-auto bg-gradient-to-br from-[#4a7e93] to-[#1F3361] text-white rounded-2xl rounded-br-none px-3 py-2 shadow-md"
                          : "mr-auto bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-none px-3 py-2 shadow-sm"
                      }`}
                    >
                      {c.message}
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            {activeLocation && (
              <div className="p-3 border-t bg-white flex items-end gap-2">
                <textarea
                  className="flex-1 p-3 rounded-xl border border-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#4a7e93] text-sm"
                  rows={2}
                  placeholder={`Ketik pesan ke ${activeLocation.to_name}...`}
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ y: -2 }}
                  onClick={handleSendMessage}
                  className="bg-gradient-to-br from-[#4a7e93] to-[#1F3361] p-3 rounded-xl text-white flex items-center justify-center shadow"
                >
                  <Send size={18} />
                </motion.button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
