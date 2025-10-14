import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    // Simple animated particle background
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Email dan password harus diisi");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        setError("Email atau password salah");
        setLoading(false);
        return;
      }

      const { data: userDetails } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email)
        .single();

      localStorage.setItem("empl_no", userDetails?.empl_no || "");
      localStorage.setItem("empl_name", userDetails?.empl_name || authData.user.email);
      localStorage.setItem("role", userDetails?.role || "Karyawan");
      localStorage.setItem("photo_url", userDetails?.photo_url || "/lank.jpg");

      if (onLogin) onLogin();
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      ></canvas>

      {/* Animated Gradient Lights */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[400px] w-[400px] bg-blue-600/30 rounded-full blur-[120px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-0 h-[500px] w-[500px] bg-purple-500/20 rounded-full blur-[150px] animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] bg-cyan-400/30 rounded-full blur-[100px] animate-[float_12s_ease-in-out_infinite]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 grid min-h-screen w-full grid-cols-12 items-center px-10">
        {/* LEFT SIDE */}
        <div className="col-span-7 flex flex-col justify-center pl-16">
          <h1 className="mb-8 text-6xl font-extrabold leading-tight tracking-tight drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            Jagarti Sarana Telekomunikasi
          </h1>
          <p className="mb-6 text-2xl italic opacity-90">Expanding Possibilities.</p>
          <a
            href="https://wa.me/6282332901726?text=Hai%20Saya%20Ingin%20daftar%20Di%20aplikasi%20JST"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-transform hover:scale-105"
          >
            Create New User
          </a>
        </div>

        {/* RIGHT SIDE */}
        <div className="col-span-5 flex items-center justify-center">
          <div className="relative w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 blur-xl opacity-40"></div>
            <h2 className="mb-8 text-3xl font-bold text-white">
              Hi, Welcome Back! 👋
            </h2>

            {error && (
              <p className="mb-4 rounded bg-red-500/20 px-3 py-2 text-red-300 border border-red-500/40">
                {error}
              </p>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-md bg-white/10 border border-white/20 px-4 py-3 text-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-md bg-white/10 border border-white/20 px-4 py-3 text-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="mb-6 flex items-center justify-between text-sm text-gray-300">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="accent-blue-500" />
                <span>Remember me</span>
              </label>
              <a
                href="https://wa.me/6282332901726?text=Hai%20Maaf%20Saya%20lupa%20password%20JST"
                className="text-blue-400 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="mb-6 w-full transform rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 font-bold text-white transition-transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="mb-6 flex items-center justify-center">
              <span className="w-1/5 border-b border-white/20"></span>
              <span className="mx-2 text-xs text-gray-400">OR</span>
              <span className="w-1/5 border-b border-white/20"></span>
            </div>

            <p className="text-center text-sm text-gray-300">
              Download The Application:{" "}
              <a href="/cctv.v3.apk" download className="text-blue-400 hover:underline">
                Click Here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-30px) translateX(20px);
          }
          100% {
            transform: translateY(0px) translateX(0px);
          }
        }
      `}</style>
    </div>
  );
}
