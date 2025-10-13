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

    // Validasi input
    if (!email || !password) {
      setError("Email dan password harus diisi");
      setLoading(false);
      return;
    }

    try {
      // Login pakai Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        setError("Email atau password salah");
        setLoading(false);
        return;
      }

      // Ambil data user dari tabel 'users'
      const { data: userDetails, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email) // pakai email dari session login
        .single();

      if (userError) {
        console.warn("Gagal ambil data user:", userError.message);
      }

      // Simpan info user di localStorage
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
    <div
      className="relative min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: "url('/kantor.jpeg')" }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 grid h-screen w-full grid-cols-12">
        {/* LEFT SIDE */}
        <div className="col-span-7 flex flex-col justify-center px-20 text-white">
          <h1 className="mb-8 text-6xl font-bold leading-tight drop-shadow-xl">
            Jagarti Sarana Telekomunikasi
          </h1>
          <p className="mb-6 text-2xl italic">Work fast. Live slow.</p>
          <a
            href="https://wa.me/6282332901726?text=Hai%20Saya%20Ingin%20daftar%20Di%20aplikasi%20JST"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90"
          >
            Create New User
          </a>
        </div>

        {/* RIGHT SIDE */}
        <div className="col-span-5 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-lg p-8 shadow-2xl">
            <h2 className="mb-8 text-3xl font-bold text-gray-800">
              Hi, Welcome Back! 👋
            </h2>

            {error && (
              <p className="mb-4 rounded bg-red-100 px-3 py-2 text-red-600">
                {error}
              </p>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <div className="mb-6 flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="text-indigo-600" />
                <span>Remember me</span>
              </label>
              <a
                href="https://wa.me/6282332901726?text=Hai%20Maaf%20Saya%20lupa%20password%20JST"
                className="text-indigo-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="mb-6 w-full transform rounded-full bg-blue-500 px-8 py-4 font-bold text-white transition-transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="mb-6 flex items-center justify-center">
              <span className="w-1/5 border-b border-gray-300"></span>
              <span className="mx-2 text-xs text-gray-500">OR</span>
              <span className="w-1/5 border-b border-gray-300"></span>
            </div>

            <p className="text-center text-sm text-gray-600">
              Download The Application:{" "}
              <a
                href="/cctv.v3.apk"
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


