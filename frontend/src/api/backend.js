import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT token into all requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("ad_agent_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Authentication API ──────────────────────────────────────────

export const login = async (email, password) => {
  const res = await API.post("/api/auth/login", { email, password });
  if (res.data?.token) {
    localStorage.setItem("ad_agent_token", res.data.token);
    localStorage.setItem("ad_agent_user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const register = async (userData) => {
  const res = await API.post("/api/auth/register", userData);
  if (res.data?.token) {
    localStorage.setItem("ad_agent_token", res.data.token);
    localStorage.setItem("ad_agent_user", JSON.stringify(res.data.user));
  }
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("ad_agent_token");
  localStorage.removeItem("ad_agent_user");
};

export const getMe = async () => {
  try {
    const res = await API.get("/api/auth/me");
    return res.data.user;
  } catch (err) {
    logout();
    return null;
  }
};

export const fetchHistory = async () => {
  const res = await API.get("/api/history");
  return res.data.runs || [];
};

// ─── Pipeline Execution API ──────────────────────────────────────

export const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append("file", file);

  const res = await API.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.path;
};

export const runPipeline = async (command, trainPath, testPath) => {
  const res = await API.post("/run", {
    command,
    train_path: trainPath,
    test_path: testPath,
  });

  return res.data.job_id;
};

export const fetchResults = async (jobId) => {
  return (await API.get(`/results/${jobId}`)).data;
};

// ─── Benchmarks API ──────────────────────────────────────────────

export const fetchBenchmarks = async () => {
  try {
    const res = await API.get("/api/benchmarks");
    return res.data.benchmarks || [];
  } catch (err) {
    console.error("Failed to load benchmarks:", err);
    return [];
  }
};

// ─── Download Helpers ────────────────────────────────────────────

export const getModelDownloadUrl = (jobId) => `${API_BASE_URL}/download/model/${jobId}`;
export const getPredictionsDownloadUrl = (jobId) => `${API_BASE_URL}/download/predictions/${jobId}`;
export const getScriptDownloadUrl = (jobId) => `${API_BASE_URL}/download/script/${jobId}`;
export const getIncidentReportDownloadUrl = (jobId) => `${API_BASE_URL}/download/incident_report/${jobId}`;
export const getArtifactUrl = (relativePath) => {
  if (!relativePath) return "";
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://") || relativePath.startsWith("data:")) {
    return relativePath;
  }
  const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${API_BASE_URL}${clean}`;
};

// ─── Analyst Review & Audit Log API ──────────────────────────────

export const fetchIncidentReviews = async (jobId) => {
  try {
    const res = await API.get(`/api/reviews/${jobId}`);
    return res.data;
  } catch (err) {
    console.error("Failed to load incident reviews:", err);
    return { reviews: [], summary: { confirmed: 0, false_positive: 0, escalated: 0, unresolved: 0 } };
  }
};

export const submitIncidentReview = async (jobId, { itemId, itemType, status, note, reviewerName, reviewerRole }) => {
  const res = await API.post(`/api/reviews/${jobId}`, {
    item_id: itemId,
    item_type: itemType || "anomaly",
    status,
    note,
    reviewer_name: reviewerName,
    reviewer_role: reviewerRole
  });
  return res.data;
};

export const fetchAuditLogs = async () => {
  try {
    const res = await API.get("/api/audit-logs");
    return res.data.logs || [];
  } catch (err) {
    console.error("Failed to load audit logs:", err);
    return [];
  }
};

export const wipeWorkspace = async () => {
  const res = await API.post("/api/workspace/wipe");
  return res.data;
};

