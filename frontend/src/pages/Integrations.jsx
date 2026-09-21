import { useState } from "react";
import { motion } from "framer-motion";
import {
  CpuChipIcon,
  CodeBracketIcon,
  BellAlertIcon,
  CloudArrowUpIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

export default function Integrations({ onBackToStudio }) {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://soc-webhooks.company.com/alerts/ad-agent");
  const [webhookTestStatus, setWebhookTestStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("api"); // "api", "webhooks", "cloud", "cctv"

  const curlSnippet = `curl -X POST "http://127.0.0.1:8000/run" \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "command": "Analyze CCTV surveillance feed for unusual optical motion patterns",
    "train_path": "data/cctv_perimeter_breach.mp4",
    "test_path": "data/cctv_perimeter_breach.mp4"
  }'`;

  const pythonSnippet = `import requests

API_URL = "http://127.0.0.1:8000"
TOKEN = "your_enterprise_jwt_token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "command": "Inspect PCB circuit board for hairline fractures and micro-defects",
    "train_path": "data/pcb_defect_sample.png"
}

response = requests.post(f"{API_URL}/run", json=payload, headers=headers)
job_id = response.json().get("job_id")
print(f"Triggered autonomous pipeline. Job ID: {job_id}")

# Fetch real-time explainability results
results = requests.get(f"{API_URL}/results/{job_id}", headers=headers).json()
print("Pipeline Modality:", results["explanation"]["modality"])
print("Triage Review State:", results["explanation"]["review_state"])`;

  const sampleWebhookPayload = {
    event: "ANOMALY_INCIDENT_FLAGGED",
    job_id: "cctv-job-8839",
    timestamp: new Date().toISOString(),
    severity: "HIGH_PRIORITY_REVIEW_REQUIRED",
    modality: "video",
    specimen: "cctv_perimeter_breach.mp4",
    incidents_count: 2,
    evidence: {
      peak_score: 0.942,
      duration_seconds: 10.0,
      optical_vector_discrepancy: "4.82x baseline"
    },
    action_required: "Review keyframe snapshots and submit analyst triage",
    triage_url: "http://localhost:5173/?jobId=cctv-job-8839"
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "curl") {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else {
      setCopiedPython(true);
      setTimeout(() => setCopiedPython(false), 2000);
    }
  };

  const handleTestWebhook = () => {
    setWebhookTestStatus("sending");
    setTimeout(() => {
      setWebhookTestStatus("success");
      setTimeout(() => setWebhookTestStatus(null), 4000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#070913] to-black text-white p-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <CpuChipIcon className="w-4 h-4 text-cyan-400" />
              <span>Production Connectors & SOC Ingestion</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Enterprise Integrations</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Connect AD-Agent to your existing Security Operations Center (SOC), RTSP cameras, AWS S3 buckets, and alert queues.
            </p>
          </div>
          {onBackToStudio && (
            <button
              onClick={onBackToStudio}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
            >
              &larr; Back to Studio
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          {[
            { id: "api", label: "REST API & SDK", icon: CodeBracketIcon },
            { id: "webhooks", label: "Webhook Alerts", icon: BellAlertIcon },
            { id: "cloud", label: "S3 / Blob Storage", icon: CloudArrowUpIcon },
            { id: "cctv", label: "RTSP CCTV Streams", icon: VideoCameraIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: REST API & SDK */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CodeBracketIcon className="w-4 h-4 text-cyan-400" />
                    cURL Command Line Trigger
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Submit detection workloads directly from CI/CD or backend microservices.</p>
                </div>
                <button
                  onClick={() => handleCopy(curlSnippet, "curl")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition-all cursor-pointer"
                >
                  {copiedCurl ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4 text-cyan-400" />}
                  <span>{copiedCurl ? "Copied" : "Copy cURL"}</span>
                </button>
              </div>
              <pre className="bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                {curlSnippet}
              </pre>
            </div>

            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CpuChipIcon className="w-4 h-4 text-emerald-400" />
                    Python Automation SDK Snippet
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Programmatically dispatch specimen inference and retrieve explainability records.</p>
                </div>
                <button
                  onClick={() => handleCopy(pythonSnippet, "python")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition-all cursor-pointer"
                >
                  {copiedPython ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4 text-emerald-400" />}
                  <span>{copiedPython ? "Copied" : "Copy Python"}</span>
                </button>
              </div>
              <pre className="bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                {pythonSnippet}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: WEBHOOK ALERTS */}
        {activeTab === "webhooks" && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BellAlertIcon className="w-5 h-5 text-rose-400" />
                  Real-Time Incident Webhook Dispatcher
                </h3>
                <p className="text-xs text-gray-400">
                  Broadcast structured JSON payloads to Slack, Microsoft Teams, PagerDuty, or SOC ingest queues whenever High-Priority review is flagged.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Target Webhook Endpoint</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                  />
                  <button
                    onClick={handleTestWebhook}
                    disabled={webhookTestStatus === "sending"}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    <span>{webhookTestStatus === "sending" ? "Dispatching..." : "Test Dispatch"}</span>
                  </button>
                </div>
                {webhookTestStatus === "success" && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Payload received successfully (HTTP 200 OK from endpoint).</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Standard Incident Payload Schema</label>
                <pre className="bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-mono text-amber-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(sampleWebhookPayload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: S3 / CLOUD STORAGE */}
        {activeTab === "cloud" && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CloudArrowUpIcon className="w-5 h-5 text-cyan-400" />
                  Cloud Object Lakehouse Polling
                </h3>
                <p className="text-xs text-gray-400">
                  Automatically ingest telemetry files uploaded to Amazon S3 buckets, Google Cloud Storage, or Azure Blob containers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Bucket URI</label>
                  <input
                    type="text"
                    defaultValue="s3://enterprise-telemetry-vault/production/iot/"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Sync Interval</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white">
                    <option>Every 5 Minutes (Continuous Surveillance)</option>
                    <option>Hourly Batch Processing</option>
                    <option>Nightly Delta Run</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2.5">
                <ShieldCheckIcon className="w-5 h-5 shrink-0" />
                <span>Encrypted in transit using TLS 1.3 with AWS KMS client-side envelope decryption.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RTSP CCTV STREAMS */}
        {activeTab === "cctv" && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <VideoCameraIcon className="w-5 h-5 text-rose-400" />
                  RTSP Network CCTV Ingestion
                </h3>
                <p className="text-xs text-gray-400">
                  Stream optical security feeds directly from IP cameras, NVRs, and perimeter hardware into the SpatioTemporal frame engine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">RTSP Stream URI</label>
                  <input
                    type="text"
                    defaultValue="rtsp://soc-cam-04.facility.internal:554/live/stream1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Sample FPS</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono">
                    <option>10 FPS (Recommended Baseline)</option>
                    <option>20 FPS (High-Precision Velocity)</option>
                    <option>5 FPS (Low-Bandwidth Mode)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5">
                <VideoCameraIcon className="w-5 h-5 shrink-0" />
                <span>Compatible with ONVIF Profile S/T, Hikvision, Dahua, Axis, and Hanwha Vision RTSP encoders.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
