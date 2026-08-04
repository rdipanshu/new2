import { useState } from "react";
import { Shield, LogIn } from "lucide-react";
import { api, formatApiErrorDetail } from "../../lib/api";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("admin_token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-black/50 border border-zinc-700 rounded-sm px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors duration-200";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Shield className="w-8 h-8 text-cyan-400" />
          <h1 className="font-heading text-2xl font-bold text-white tracking-tight">Admin Console</h1>
        </div>
        <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-md p-8 space-y-5">
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest text-center">// restricted access</p>
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} data-testid="admin-login-email" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} data-testid="admin-login-password" />
          {error && <p className="text-red-500 text-sm" data-testid="admin-login-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            data-testid="admin-login-submit"
            className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 text-black font-semibold px-6 py-3 rounded-sm hover:bg-cyan-400 transition-colors duration-200 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" /> {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
