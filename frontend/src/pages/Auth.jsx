import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { login, register } from "../api/backend";
import {
  SparklesIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowRightIcon,
  LockClosedIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login(email, password);
        onAuthSuccess(res.user);
      } else {
        const res = await register({ email, password, name, company });
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setIsLogin(true);
    setEmail("demo@adagent.ai");
    setPassword("Enterprise2025!");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0c1f] to-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-35" />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-stretch"
      >
        {/* Left Panel: High-Value Commercial Pitch */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 lg:p-12 backdrop-blur-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-3xl shadow-2xl">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 rounded-full">
              <SparklesIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                Next-Gen Agentic AI Platform
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Enterprise Anomaly Detection.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300">
                Autonomous. Explainable.
              </span>
            </h1>

            <p className="text-gray-400 text-base lg:text-lg leading-relaxed max-w-xl">
              Turn natural language prompts and raw multi-modal data into production-grade anomaly detection pipelines. 
              Our 7 specialized AI agents select, build, evaluate, and interpret algorithms with zero manual coding.
            </p>

            {/* Modalities Pill Matrix */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <ChartBarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Tabular & Financial</h4>
                  <p className="text-xs text-gray-400">PyOD (IForest, ECOD)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <CpuChipIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Sensor & IoT</h4>
                  <p className="text-xs text-gray-400">Darts (N-BEATS, DLinear)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Graph & Fraud Rings</h4>
                  <p className="text-xs text-gray-400">PyGOD (DOMINANT, SCAN)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <EyeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Vision & Defects</h4>
                  <p className="text-xs text-gray-400">Anomalib & VLM Heatmaps</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof & Trust Badges */}
          <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="w-5 h-5 text-green-400" />
              <span>SOC2 Type II Ready Architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Subprocess Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="w-5 h-5 text-indigo-400" />
              <span>Grounded RAG (Zero Hallucination)</span>
            </div>
          </div>
        </div>

        {/* Right Panel: High-Conversion Auth Card */}
        <div className="lg:col-span-5 p-8 lg:p-10 backdrop-blur-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/15 rounded-3xl shadow-2xl flex flex-col justify-center">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                isLogin
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                !isLogin
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isLogin ? "Welcome Back" : "Join AD-Agent Enterprise"}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {isLogin
                ? "Enter your credentials to access your autonomous workspace."
                : "Start running end-to-end anomaly intelligence pipelines."}
            </p>
          </div>

          {/* Quick Demo Login Preset Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={fillDemo}
              className="w-full py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 transition-all group"
            >
              <SparklesIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>1-Click Enterprise Demo Credentials</span>
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 mb-6 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
            >
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">Company / Organization</label>
                  <div className="relative">
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Financial Corp"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Work Email</label>
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@enterprise.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Password</label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
              type="submit"
              className="w-full mt-4 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In to Studio" : "Create Enterprise Account"}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            By signing in, you agree to our Enterprise Terms of Service and Privacy Protocol.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
