import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [noID, setNoID] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // Cari user di database berdasarkan empl_no
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("empl_no", noID)
      .single();

    if (fetchError || !user) {
      setError("User tidak ditemukan");
      setLoading(false);
      return;
    }

    if (user.password !== password) {
      setError("Password salah");
      setLoading(false);
      return;
    }

    // ✅ Login sukses → simpan data ke localStorage
    localStorage.setItem("empl_no", user.empl_no);
    localStorage.setItem("empl_name", user.empl_name || "User");
    localStorage.setItem("role", user.role || "Karyawan");
    localStorage.setItem("photo_url", user.photo_url || "/lank.jpg");

    // Update state global kalau ada
    if (onLogin) onLogin();

    // Redirect ke dashboard/home
    navigate("/", { replace: true });
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-12 overflow-hidden bg-[#422ED0]">
      {/* Left Section */}
      <div className="col-span-7 flex p-20 text-white">
        <div className="flex flex-col justify-between w-full">
          <div>
            <h1 className="mt-20 my-8 text-6xl font-bold text-indigo-50 leading-tight">
              Enter your account and discover new experiences in Jagarti Sarana Telekomunikasi
            </h1>
            <p className="mb-2 text-xl">You do not have an account?</p>
            <div className="flex items-center gap-x-6">
              <a
                href="https://wa.me/6282332901726?text=Hai%20Saya%20Ingin%20daftar%20Di%20aplikasi%20JST"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-violet-500 px-4 py-2 font-semibold text-white shadow-lg hover:opacity-90"
              >
                Create New User
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative col-span-5 flex rounded-tl-[44px] bg-white">
        <div className="absolute top-4 right-0 -left-4 h-full w-full rounded-tl-[44px] bg-white/50"></div>
        <div className="z-10 w-full">
          <div className="mx-auto mt-20 max-w-md bg-white p-6 sm:p-10 lg:max-w-lg">
            <h2 className="mb-10 text-4xl font-bold text-slate-600">
              Hi, Welcome Back! 👋
            </h2>

            {error && (
              <p className="mb-4 rounded bg-red-100 px-3 py-2 text-red-600">{error}</p>
            )}

            {/* No ID */}
            <input
              type="text"
              placeholder="No ID"
              value={noID}
              onChange={(e) => setNoID(e.target.value)}
              className="mb-6 w-full border-b border-gray-300 px-4 py-4 text-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            {/* Password */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full border-b border-gray-300 px-4 py-4 text-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            {/* Remember Me + Forgot */}
            <div className="mb-10 flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="text-indigo-600" />
                <span className="font-medium text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-lg font-medium text-indigo-600 hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="mb-6 w-full transform rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white transition-transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            {/* Or */}
            <div className="mb-6 flex items-center justify-center">
              <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
              <span className="mx-2 text-xs text-gray-400">OR</span>
              <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
            </div>

            {/* Download Application */}
            <p className="mt-12 text-center text-sm text-gray-500">
              Download The Application:{" "}
              <a
                href="/cctv.apk"
                download
                className="text-indigo-600 hover:underline"
              >
                Click Here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
