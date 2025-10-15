import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Globe } from "lucide-react";

export default function CreativePage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col items-center justify-center px-8 py-16">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Selamat Datang 👋
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Halaman ini masih belum berfungsi, tapi tampilannya sudah interaktif
          dan siap dikembangkan menjadi apapun — dashboard, galeri, atau portal
          kreatif kamu!
        </p>
      </motion.div>

      {/* Interactive Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl">
        <FeatureCard
          icon={<Sparkles className="w-10 h-10 text-blue-500" />}
          title="Desain Modern"
          description="Tampilan putih minimalis dengan sentuhan animasi lembut dari Framer Motion."
        />
        <FeatureCard
          icon={<Zap className="w-10 h-10 text-yellow-500" />}
          title="Responsif & Cepat"
          description="Dibangun menggunakan React + Tailwind, tampil optimal di semua perangkat."
        />
        <FeatureCard
          icon={<Globe className="w-10 h-10 text-green-500" />}
          title="Siap Terhubung"
          description="Integrasikan dengan API, database, atau sistem apapun sesuai kebutuhan."
        />
      </div>

      {/* Call to Action Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="mt-16 text-center"
      >
        <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-semibold shadow-md hover:bg-blue-700 transition-all duration-300">
          Mulai Kembangkan Sekarang 🚀
        </button>
      </motion.div>

      {/* Footer */}
      <footer className="mt-24 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} — Dibuat dengan ❤️ & React.js
      </footer>
    </div>
  );
}

/* Card Component */
function FeatureCard({ icon, title, description }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-500">{description}</p>
      </div>
    </motion.div>
  );
}
