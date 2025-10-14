import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

      const { data: userDetails, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email)
        .single();

      if (userError) {
        console.warn("Gagal ambil data user:", userError.message);
      }

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
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e3a8a]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/30 via-purple-500/20 to-indigo-700/10 blur-3xl opacity-70"></div>

      {/* Floating glowing orbs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px] animate-pulse" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-cyan-400/10 blur-[120px] animate-ping" />

      <div className="relative z-10 grid min-h-screen w-full grid-cols-12 items-center">
        {/* LEFT SIDE */}
        <div className="col-span-7 flex flex-col justify-center px-20 text-white">
          <h1 className="mb-8 text-6xl font-extrabold leading-tight tracking-tight drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
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
          <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all hover:shadow-[0_0_60px_rgba(59,130,246,0.3)]">
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
              <a
                href="/cctv.v3.apk"
                download
                className="text-blue-400 hover:underline"
              >
                Click Here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Animasi gradien halus */}
      <style jsx>{`
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientMove 8s ease infinite;
        }
      `}</style>
    </div>
  );
}
