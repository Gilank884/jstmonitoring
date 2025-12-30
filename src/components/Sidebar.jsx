import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  FiMenu,
  FiHome,
  FiUser,
  FiDatabase,
  FiCheckCircle,
  FiX,
  FiBox,
  FiPackage,
  FiTwitch,
  FiDownload
} from "react-icons/fi";
import { gsap } from "gsap";

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
  const sidebarRef = useRef(null);
  const overlayRef = useRef(null);

  // ✅ Menu sudah disusun tanpa duplikasi path atau nama
  const menus = [
    { name: "Dashboard", path: "/", icon: <FiHome /> },
    { name: "Profile", path: "/profile", icon: <FiUser /> },
    { name: "Work Order", path: "/workorder", icon: <FiDatabase /> },
    { name: "Close Order", path: "/closeorder", icon: <FiCheckCircle /> },
    { name: "Report Issue", path: "/reportissue", icon: <FiBox /> },
    { name: "Report", path: "/report", icon: <FiDownload /> },

  ];

  // Set posisi awal sidebar dan overlay
  useLayoutEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      gsap.set(sidebarRef.current, { x: "-100%" });
      gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
    } else {
      gsap.set(sidebarRef.current, { x: 0 });
      gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
    }
  }, []);

  // Animasi GSAP saat buka/tutup sidebar
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    if (isOpen) {
      gsap.to(sidebarRef.current, { x: 0, duration: 0.4, ease: "power2.out" });
      gsap.to(overlayRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
      });
    } else {
      gsap.to(sidebarRef.current, {
        x: "-100%",
        duration: 0.4,
        ease: "power2.in",
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.3,
      });
    }
  }, [isOpen]);

  // Reset posisi saat resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
        gsap.set(sidebarRef.current, { x: 0 });
        gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
      } else {
        setIsOpen(false);
        gsap.set(sidebarRef.current, { x: "-100%" });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Tombol menu mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-[#4a7e93] hover:bg-[#3c6a7d] text-white p-2 rounded-xl shadow-md transition md:hidden"
      >
        <FiMenu size={22} />
      </button>

      {/* Overlay dengan logo */}
      <div
        ref={overlayRef}
        style={{
          backgroundImage: "url(/logo.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "85% center",
          backgroundSize: "150px auto",
        }}
        className="fixed inset-0 z-40 opacity-0 pointer-events-none bg-black/40 md:hidden"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed md:relative top-0 left-0 h-screen bg-gradient-to-b from-[#4a7e93] to-[#1F3361] text-white shadow-[4px_0_15px_rgba(0,0,0,0.3)] flex flex-col w-64 z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <span className="text-lg font-bold tracking-wide text-white">
            Jagarti Sarana Telekomunikasi
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 md:hidden"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4 px-3 space-y-1">
          {menus.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
                  ? "bg-white/20 text-white shadow-inner"
                  : "hover:bg-white/15 text-gray-200"
                  }`}
              >
                <span
                  className={`text-lg ${isActive ? "text-white" : "text-gray-300"
                    }`}
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20 text-xs text-gray-200">
          © 2025 Jagarti Team
        </div>
      </div>
    </>
  );
};

export default Sidebar;
